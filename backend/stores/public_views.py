from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Store, StoreReport, StoreScratchConfig
from .serializers import PublicStoreSerializer
from categories.models import Category
from categories.serializers import CategorySerializer
from products.models import Product
from products.serializers import PublicProductSerializer


from django.db import models
from math import asin, cos, radians, sin, sqrt

from config.websocket import broadcast_order_event_sync
from config.pagination import StandardResultsSetPagination

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


class PublicStoreListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicStoreSerializer

    def get_queryset(self):
        return Store.objects.filter(is_published=True).order_by('name')

    def list(self, request, *args, **kwargs):
        stores = list(self.get_queryset())
        category = request.query_params.get('category', '').strip().upper()
        if category:
            stores = [store for store in stores if store.business_type == category]

        try:
            latitude = float(request.query_params['lat'])
            longitude = float(request.query_params['lng'])
            radius_km = min(max(float(request.query_params.get('radius_km', 10)), 1), 100)
        except (KeyError, TypeError, ValueError):
            latitude = longitude = None
            radius_km = 10

        serialized = self.get_serializer(stores, many=True).data
        if latitude is None or longitude is None:
            return Response(serialized)

        nearby = []
        for store, data in zip(stores, serialized):
            if store.latitude is None or store.longitude is None:
                continue
            lat1, lon1 = radians(latitude), radians(longitude)
            lat2, lon2 = radians(float(store.latitude)), radians(float(store.longitude))
            delta_lat, delta_lon = lat2 - lat1, lon2 - lon1
            distance = 6371 * 2 * asin(sqrt(sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2))
            if distance <= radius_km:
                data['distance_km'] = round(distance, 1)
                nearby.append(data)
        nearby.sort(key=lambda store: store['distance_km'])
        return Response(nearby)


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
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        store = get_public_store_or_404(self.request, slug)
        qs = Product.objects.filter(store=store).select_related('store', 'category').prefetch_related('images')
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
            # Scratch rewards come only from the seller-owned server config.
            # Never create coupons from values supplied by an anonymous client.
            try:
                scratch = store.scratch_config
            except StoreScratchConfig.DoesNotExist:
                scratch = None
            if scratch and scratch.enabled and scratch.coupon_code.strip().upper() == code:
                coupon = Coupon(
                    store=store,
                    code=scratch.coupon_code.strip().upper(),
                    discount_type='PERCENTAGE' if scratch.discount_type.lower() == 'percentage' else 'FLAT',
                    discount_value=scratch.discount_value,
                    min_order_amount=scratch.min_order,
                    is_active=True,
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


import html
from django.http import HttpResponse, Http404
from django.conf import settings

CATEGORY_OG_METADATA = {
    'GARMENTS': {
        'emoji': '👗',
        'label': 'Fashion & Clothing / फॅशन व कपडे',
        'desc': 'नवीनतम ड्रेसेस, साड्या व ट्रेंडिंग फॅशन कलेक्शन ऑनलाइन पहा.'
    },
    'KIRANA': {
        'emoji': '🛒',
        'label': 'किराणा व सुपरमार्केट / Kirana & Grocery',
        'desc': 'ताजा किराणा, धान्य व रोजच्या गरजेच्या वस्तू ऑनलाइन मागवा.'
    },
    'PHOTO_STUDIO': {
        'emoji': '📸',
        'label': 'फोटो स्टुडिओ व सर्व्हिसेस / Photo Studio',
        'desc': 'फोटोशूट, अल्बम प्रिंटिंग, कस्टमाईज फ्रेम्स व डिजिटल सर्व्हिसेस.'
    },
    'RESTAURANT': {
        'emoji': '🍲',
        'label': 'हॉटेल व रेस्टॉरंट / Food & Dine',
        'desc': 'गरमागरम स्वादिष्ट जेवण, मेन्यू व पार्सल सुविधा.'
    },
    'HOTEL_RESTAURANT': {
        'emoji': '🍲',
        'label': 'हॉटेल व रेस्टॉरंट / Food & Dine',
        'desc': 'गरमागरम स्वादिष्ट जेवण, मेन्यू व पार्सल सुविधा.'
    },
    'BAKERY_SWEETS': {
        'emoji': '🎂',
        'label': 'बेकरी, केक्स व मिठाई / Bakery & Sweets',
        'desc': 'ताजे केक्स, मिठाई, पेस्ट्रीज व डेअरी उत्पादने.'
    },
    'DAIRY_SWEETS': {
        'emoji': '🥛',
        'label': 'डेअरी व मिठाई / Dairy & Sweet Mart',
        'desc': 'ताजे दूध, मिठाई व डेअरी उत्पादने ऑनलाइन उपलब्ध.'
    },
    'ELECTRONICS': {
        'emoji': '📱',
        'label': 'इलेक्ट्रॉनिक्स व मोबाईल्स / Electronics Store',
        'desc': 'मोबाईल्स, गॅजेट्स, इलेक्ट्रॉनिक्स व ॲक्सेसरीज.'
    },
    'PHARMACY': {
        'emoji': '💊',
        'label': 'मेडिकल व फार्मसी / Medical & Pharmacy',
        'desc': 'औषधे, हेल्थकेअर व वेलनेस उत्पादने.'
    },
    'HARDWARE_PLUMBING': {
        'emoji': '🔧',
        'label': 'हार्डवेअर व टूल्स / Hardware & Tools',
        'desc': 'हार्डवेअर, टूल्स, प्लंबिंग व बांधकाम साहित्य.'
    },
    'BUILDING_MATERIAL': {
        'emoji': '🏗️',
        'label': 'बांधकाम साहित्य व सिमेंट / Building Materials',
        'desc': 'सिमेंट, स्टील, प्लंबिंग व दर्जेदार बांधकाम साहित्य.'
    },
    'GIFT_TOYS': {
        'emoji': '🎁',
        'label': 'गिफ्ट शॉप व खेळणी / Gifts & Toys',
        'desc': 'आकर्षक गिफ्ट्स, खेळणी व डेकोरेशन उत्पादने.'
    },
    'STATIONERY': {
        'emoji': '📚',
        'label': 'पुस्तके व स्टेशनरी / Books & Stationery',
        'desc': 'पुस्तके, वह्या, शालेय व ऑफिस स्टेशनरी साहित्य.'
    },
    'BEAUTY_JEWELLERY': {
        'emoji': '✨',
        'label': 'दागिने व ब्यूटी / Jewellery & Beauty',
        'desc': 'आकर्षक ज्वेलरी, कॉस्मेटिक्स व ब्यूटी उत्पादने.'
    },
}

def get_store_fulfillment_badge(allow_delivery: bool, allow_pickup: bool) -> str:
    if allow_delivery and allow_pickup:
        return "घरपोच डिलिव्हरी (Home Delivery) व स्टोअर पिकअप उपलब्ध."
    elif allow_delivery and not allow_pickup:
        return "थेट घरपोच डिलिव्हरी (Home Delivery) उपलब्ध."
    elif not allow_delivery and allow_pickup:
        return "दुकानातून पिकअप (Store Pickup) व इन-स्टोअर खरेदी उपलब्ध."
    else:
        return "थेट WhatsApp वरून ऑर्डर व चौकशी करा."

def public_store_og_view(request, slug):
    store = Store.objects.filter(models.Q(slug=slug) | models.Q(custom_domain=slug)).first()
    if not store:
        return HttpResponse("Store not found", status=404)

    store_name = (store.name or "Online Store").strip()
    b_type = (store.business_type or 'GENERAL').upper()
    cat_meta = CATEGORY_OG_METADATA.get(b_type, {
        'label': 'Official Online Store',
        'desc': 'संपूर्ण प्रॉडक्ट कॅटलॉग, ऑफर्स व थेट ऑनलाइन ऑर्डर.'
    })

    allow_delivery = getattr(store, 'allow_home_delivery', True)
    allow_pickup = getattr(store, 'allow_store_pickup', True)
    fulfillment_badge = get_store_fulfillment_badge(allow_delivery, allow_pickup)

    og_title = f"{store_name} | {cat_meta['label']} • Online Store"
    if store.description and store.description.strip():
        og_desc = f"{store.description.strip()} • {fulfillment_badge}"
    else:
        og_desc = f"{cat_meta['desc']} {fulfillment_badge}"

    frontend_base = getattr(settings, 'FRONTEND_URL', 'https://www.apanidukan.com').rstrip('/')
    if 'localhost' in frontend_base or '127.0.0.1' in frontend_base:
        frontend_base = 'https://www.apanidukan.com'

    logo_url = ""
    if store.logo:
        try:
            logo_url = request.build_absolute_uri(store.logo.url)
        except Exception:
            logo_url = store.logo.url if hasattr(store.logo, 'url') else str(store.logo)

    if not logo_url or 'localhost' in logo_url or '127.0.0.1' in logo_url:
        logo_url = f"{frontend_base}/store-default-banner.jpg"

    store_url = f"{frontend_base}/s/{store.slug}"

    safe_title = html.escape(og_title, quote=True)
    safe_desc = html.escape(og_desc, quote=True)
    safe_store_name = html.escape(store_name, quote=True)

    html_content = f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{safe_title}</title>
    <meta name="title" content="{safe_title}" />
    <meta name="description" content="{safe_desc}" />
    
    <!-- Open Graph / WhatsApp Social Preview -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{store_url}" />
    <meta property="og:title" content="{safe_title}" />
    <meta property="og:description" content="{safe_desc}" />
    <meta property="og:image" content="{logo_url}" />
    <meta property="og:site_name" content="{safe_store_name}" />
    
    <!-- Twitter Preview -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="{store_url}" />
    <meta property="twitter:title" content="{safe_title}" />
    <meta property="twitter:description" content="{safe_desc}" />
    <meta property="twitter:image" content="{logo_url}" />

    <!-- Instant Client-side redirect for browser users -->
    <script>
        window.location.href = "{store_url}";
    </script>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#0f172a;">
    <h1 style="font-size:24px;font-weight:900;margin-bottom:8px;">{safe_store_name}</h1>
    <p style="font-size:14px;color:#475569;max-width:500px;margin:0 auto 20px;">{safe_desc}</p>
    <a href="{store_url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        Open Store ↗
    </a>
</body>
</html>"""
    return HttpResponse(html_content, content_type="text/html; charset=utf-8")

