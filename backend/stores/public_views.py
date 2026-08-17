from rest_framework import generics, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Store
from .serializers import PublicStoreSerializer
from categories.models import Category
from categories.serializers import CategorySerializer
from products.models import Product
from products.serializers import PublicProductSerializer


from django.db import models

from config.websocket import broadcast_order_event_sync

from django.http import Http404

def get_public_store_or_404(request, slug):
    store = Store.objects.filter(slug=slug).first()
    if not store:
        raise Http404("Store not found")
    if not store.is_published:
        if request.user and request.user.is_authenticated and store.owner == request.user:
            pass
        else:
            raise Http404("Store is not published")
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
            return Response({'valid': False, 'detail': 'Invalid or expired coupon code.'}, status=400)

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
        if coupon.discount_type == 'PERCENTAGE':
            discount = (subtotal * float(coupon.discount_value)) / 100.0
            if coupon.max_discount_amount:
                discount = min(discount, float(coupon.max_discount_amount))
        else:
            discount = float(coupon.discount_value)

        discount = min(discount, subtotal)
        final_total = max(0.0, subtotal - discount)

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
            'detail': f'Coupon {coupon.code} applied successfully! Saved ₹{discount:.2f}'
        })

