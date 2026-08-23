from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Store, StoreReport
from .serializers import PublicStoreSerializer
from categories.models import Category
from categories.serializers import CategorySerializer
from products.models import Product
from products.serializers import PublicProductSerializer


from django.db import models

from config.websocket import broadcast_order_event_sync

from django.http import Http404


class StoreOfflineException(APIException):
    status_code = 400
    default_detail = 'Store is currently offline for maintenance.'
    default_code = 'store_offline'


def get_public_store_or_404(request, slug):
    store = Store.objects.filter(models.Q(slug=slug) | models.Q(custom_domain=slug)).first()
    if not store:
        raise Http404("Store not found")
    if not store.is_published:
        if request.user and request.user.is_authenticated and store.owner == request.user:
            pass
        else:
            raise StoreOfflineException()
    return store


class PublicStoreDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicStoreSerializer

    def get_object(self):
        slug = self.kwargs.get('slug')
        store = get_public_store_or_404(self.request, slug)
        Store.objects.filter(id=store.id).update(visits_count=models.F('visits_count') + 1)
        store.refresh_from_db(fields=['visits_count'])
        try:
            broadcast_order_event_sync(f"store_{store.id}", {'type': 'store_visit', 'store_id': store.id})
        except Exception:
            pass
        return store


class PublicStoreCategoriesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        store = get_public_store_or_404(self.request, slug)
        return Category.objects.filter(store=store, is_active=True).order_by('sort_order')


class PublicStoreProductsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicProductSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        store = get_public_store_or_404(self.request, slug)
        qs = Product.objects.filter(store=store)
        if not (self.request.user and self.request.user.is_authenticated and store.owner == self.request.user):
            qs = qs.filter(is_published=True)
        category = self.request.query_params.get('category')
        q = self.request.query_params.get('q')
        if category:
            qs = qs.filter(category__slug=category)
        if q:
            qs = qs.filter(name__icontains=q)
        return qs.order_by('-created_at')


class PublicProductDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicProductSerializer

    def get_object(self):
        store_slug = self.kwargs.get('slug')
        product_slug = self.kwargs.get('product_slug')
        store = get_public_store_or_404(self.request, store_slug)
        product = get_object_or_404(Product, store=store, slug=product_slug)
        if not product.is_published and not (self.request.user and self.request.user.is_authenticated and store.owner == self.request.user):
            raise Http404("Product is not published")
        Product.objects.filter(id=product.id).update(views_count=models.F('views_count') + 1)
        product.refresh_from_db(fields=['views_count'])
        try:
            broadcast_order_event_sync(f"store_{store.id}", {'type': 'product_view', 'product_id': product.id})
        except Exception:
            pass
        return product


class PublicRecordSearchView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        query = request.data.get('query', '').strip().lower()
        if not query:
            return Response({'detail': 'Query is required.'}, status=400)
        
        from .models import SearchQuery
        from django.utils import timezone
        
        search_obj, created = SearchQuery.objects.get_or_create(
            store=store, 
            query_term=query,
            defaults={'search_count': 1, 'last_searched_at': timezone.now()}
        )
        if not created:
            search_obj.search_count += 1
            search_obj.last_searched_at = timezone.now()
            search_obj.save(update_fields=['search_count', 'last_searched_at'])
            
        return Response({'success': True})

class PublicAiSearchView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        query = request.data.get('query', '').strip()
        
        if not query:
            return Response({'detail': 'Query is required.'}, status=400)
            
        from chat.ai_utils import process_ai_search
        qs = process_ai_search(query, store.id)
        
        # Serialize the products
        serializer = PublicProductSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class PublicStoreCouponsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        store = get_public_store_or_404(request, slug)
        from products.models import Coupon
        from django.utils import timezone
        now = timezone.now()
        coupons = Coupon.objects.filter(store=store, is_active=True).select_related('product').filter(
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=now)
        )
        data = [{
            'id': c.id,
            'code': c.code,
            'discount_type': c.discount_type,
            'discount_value': float(c.discount_value),
            'min_order_amount': float(c.min_order_amount),
            'max_discount_amount': float(c.max_discount_amount) if c.max_discount_amount else None,
            'product_id': c.product_id,
            'product_name': c.product.name if c.product else None,
        } for c in coupons]
        return Response(data)


class PublicValidateCouponView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        store = get_public_store_or_404(request, slug)
        code = request.data.get('code', '').strip().upper()
        subtotal = float(request.data.get('subtotal', 0))
        items = request.data.get('items', [])  # list of item objects or product ids in cart

        if not code:
            return Response({'valid': False, 'detail': 'Coupon code is required.'}, status=400)

        from products.models import Coupon
        from django.utils import timezone
        now = timezone.now()

        coupon = Coupon.objects.filter(store=store, code__iexact=code, is_active=True).select_related('product').filter(
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=now)
        ).first()

        if not coupon:
            # Auto-create/register dynamic scratch card coupon in database ONLY if explicitly scratch reward code
            is_scratch = request.data.get('is_scratch')
            if is_scratch:
                scratch_val = float(request.data.get('scratch_discount_value', 50.0))
                scratch_type = str(request.data.get('scratch_discount_type', 'FIXED')).upper()
                scratch_min = float(request.data.get('scratch_min_order', 0.0))

                coupon, _ = Coupon.objects.get_or_create(
                    store=store,
                    code=code,
                    defaults={
                        'discount_type': scratch_type if scratch_type in ['PERCENTAGE', 'FIXED'] else 'FIXED',
                        'discount_value': scratch_val,
                        'min_order_amount': scratch_min,
                        'is_active': True
                    }
                )

        if not coupon:
            return Response({'valid': False, 'detail': f'Invalid or expired coupon code "{code}".'}, status=400)

        # Product-specific coupon validation
        cart_product_ids = []
        for it in items:
            if isinstance(it, dict):
                cart_product_ids.append(it.get('id'))
            elif isinstance(it, (int, str)):
                cart_product_ids.append(int(it))

        if coupon.product:
            if coupon.product.id not in cart_product_ids:
                return Response({
                    'valid': False,
                    'detail': f'Coupon "{coupon.code}" is valid only when "{coupon.product.name}" is in your cart.'
                }, status=400)

        if subtotal < float(coupon.min_order_amount):
            return Response({
                'valid': False,
                'detail': f'Minimum order amount of ₹{float(coupon.min_order_amount):.2f} required for coupon {coupon.code}.'
            }, status=400)

        discount = 0.0
        bogo_message = ''
        if coupon.discount_type == 'PERCENTAGE':
            discount = (subtotal * float(coupon.discount_value)) / 100.0
            if coupon.max_discount_amount:
                discount = min(discount, float(coupon.max_discount_amount))
        elif coupon.discount_type == 'BOGO':
            # Buy 1 Get 1 Free calculation logic:
            # Requires at least 2 quantity total (or 2 of specific product) to get 1 free item.
            if coupon.product:
                matching_item = next((it for it in items if isinstance(it, dict) and it.get('id') == coupon.product.id), None)
                qty = matching_item.get('quantity', 1) if matching_item else 1
                price = float(coupon.product.price)
            else:
                qty = sum(it.get('quantity', 1) if isinstance(it, dict) else 1 for it in items) if items else 1
                price = (subtotal / qty) if qty > 0 else 0.0

            free_units = qty // 2
            if free_units < 1:
                return Response({
                    'valid': False,
                    'detail': f'🎁 Buy 1 Get 1 Free coupon requires at least 2 items in cart! Increase item quantity to 2 to get 1 FREE item.'
                }, status=400)
            
            discount = free_units * price
            bogo_message = f'🎁 Buy 1 Get 1 Free applied! ({free_units} Free Item{"s" if free_units > 1 else ""} included, Saved ₹{discount:.2f})'
        elif coupon.discount_type == 'FREE_DELIVERY':
            discount = float(coupon.discount_value) if float(coupon.discount_value) > 0 else 0.0
        else:
            discount = float(coupon.discount_value)

        discount = min(discount, subtotal)
        final_total = max(0.0, subtotal - discount)

        message_detail = bogo_message if bogo_message else (
            f'🚚 Free Delivery Coupon {coupon.code} applied!' if coupon.discount_type == 'FREE_DELIVERY' else f'Coupon {coupon.code} applied successfully! Saved ₹{discount:.2f}'
        )

        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'discount_amount': discount,
            'subtotal': subtotal,
            'final_total': final_total,
            'product_id': coupon.product_id,
            'product_name': coupon.product.name if coupon.product else None,
            'detail': message_detail
        })



class StoreReportSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=[choice[0] for choice in StoreReport.REASON_CHOICES])
    details = serializers.CharField(min_length=10, max_length=1500, trim_whitespace=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True, max_length=40)


class PublicStoreReportView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = StoreReportSerializer
    throttle_scope = 'public_report'

    def post(self, request, slug):
        store = get_public_store_or_404(request, slug)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = StoreReport.objects.create(store=store, **serializer.validated_data)
        return Response({'success': True, 'report_id': report.id, 'message': 'Your report has been submitted for review.'}, status=status.HTTP_201_CREATED)

from .serializers import CustomerNotificationSerializer
from .models import CustomerNotification

class PublicCustomerNotificationsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomerNotificationSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        store_id = self.kwargs.get('store_id')
        if store_id:
            from django.shortcuts import get_object_or_404
            store = get_object_or_404(Store, id=store_id)
        else:
            store = get_public_store_or_404(self.request, slug)
        token = self.request.query_params.get('token')
        if not token:
            return CustomerNotification.objects.none()
        return CustomerNotification.objects.filter(store=store, customer_id=token)[:50]

    def post(self, request, *args, **kwargs):
        slug = self.kwargs.get('slug')
        store_id = self.kwargs.get('store_id')
        if store_id:
            from django.shortcuts import get_object_or_404
            store = get_object_or_404(Store, id=store_id)
        else:
            store = get_public_store_or_404(self.request, slug)
        token = request.data.get('token') or request.query_params.get('token')
        if not token:
            return Response({'success': False})
        
        action = request.data.get('action')
        if action == 'create':
            notif = CustomerNotification.objects.create(
                store=store,
                customer_id=token,
                notification_type=request.data.get('type', 'system'),
                title=request.data.get('title', ''),
                body=request.data.get('body', ''),
                link=request.data.get('link', '')
            )
            return Response({'success': True, 'id': notif.id})
            
        notif_id = request.data.get('id')
        if notif_id:
            CustomerNotification.objects.filter(store=store, customer_id=token, id=notif_id).update(is_read=True)
        else:
            CustomerNotification.objects.filter(store=store, customer_id=token, is_read=False).update(is_read=True)
        return Response({'success': True})


from django.http import HttpResponse, Http404
from django.conf import settings

def public_store_og_view(request, slug):
    store = Store.objects.filter(models.Q(slug=slug) | models.Q(custom_domain=slug)).first()
    if not store:
        return HttpResponse("Store not found", status=404)

    store_name = store.name or "Online Store"
    store_desc = store.description or f"Order online directly from {store_name}. Fast doorstep delivery & verified quality."
    
    logo_url = ""
    if store.logo:
        try:
            logo_url = request.build_absolute_uri(store.logo.url)
        except Exception:
            logo_url = store.logo.url if hasattr(store.logo, 'url') else str(store.logo)
    
    if not logo_url:
        frontend_base = getattr(settings, 'FRONTEND_URL', 'https://www.apanidukan.com').rstrip('/')
        logo_url = f"{frontend_base}/apanidukan1.png"

    frontend_base = getattr(settings, 'FRONTEND_URL', 'https://www.apanidukan.com').rstrip('/')
    store_url = f"{frontend_base}/store/{store.slug}"

    html = f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{store_name} - Official Online Store</title>
    <meta name="title" content="{store_name} - Official Online Store" />
    <meta name="description" content="{store_desc}" />
    
    <!-- Open Graph / WhatsApp Social Preview -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{store_url}" />
    <meta property="og:title" content="{store_name} - Official Online Store" />
    <meta property="og:description" content="{store_desc}" />
    <meta property="og:image" content="{logo_url}" />
    <meta property="og:site_name" content="{store_name}" />
    
    <!-- Twitter Preview -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="{store_url}" />
    <meta property="twitter:title" content="{store_name} - Official Online Store" />
    <meta property="twitter:description" content="{store_desc}" />
    <meta property="twitter:image" content="{logo_url}" />

    <!-- Redirect Browser Visitors to React App -->
    <script>
        window.location.href = "{store_url}";
    </script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#0f172a;">
    <h1 style="font-size:24px;font-weight:900;">{store_name}</h1>
    <p style="font-size:14px;color:#475569;">{store_desc}</p>
    <a href="{store_url}" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold;">
        Open {store_name} Store ↗
    </a>
</body>
</html>"""
    return HttpResponse(html, content_type="text/html")

