import json
import urllib.request
from decimal import Decimal
from django.core.files.base import ContentFile
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from stores.models import Store
from .models import Product
from .serializers import ProductSerializer


from config.websocket import broadcast_order_event_sync

class IsStoreOwner(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return obj.store.owner == request.user


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(store__owner=self.request.user)

    def perform_create(self, serializer):
        store = serializer.validated_data.get('store')
        if not store or store.owner != self.request.user:
            raise PermissionDenied('You can only add products to your own store.')
        product = serializer.save()
        try:
            broadcast_order_event_sync(f"store_{store.id}", {
                "type": "new_product_added",
                "product": ProductSerializer(product).data
            })
        except Exception:
            pass

    def perform_update(self, serializer):
        store = serializer.validated_data.get('store', serializer.instance.store)
        if store.owner != self.request.user:
            raise PermissionDenied('You can only use your own store.')
        serializer.save()

    def get_permissions(self):
        if self.action in ['retrieve', 'list']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create_products(self, request):
        store_id = request.data.get('store_id')
        category_id = request.data.get('category_id')
        items_data = request.data.get('products', [])

        if isinstance(items_data, str):
            try:
                items_data = json.loads(items_data)
            except Exception:
                items_data = []

        if not store_id or not isinstance(items_data, list) or len(items_data) == 0:
            return Response({'detail': 'store_id and non-empty products list required.'}, status=status.HTTP_400_BAD_REQUEST)

        store = get_object_or_404(Store, id=store_id, owner=request.user)
        default_category = None
        if category_id:
            from categories.models import Category
            default_category = Category.objects.filter(id=category_id, store=store).first()

        # Pre-fetch existing product slugs for the store to prevent UNIQUE constraint collisions
        existing_slugs = set(Product.objects.filter(store=store).values_list('slug', flat=True))
        
        created_objs = []
        cat_cache = {}

        with transaction.atomic():
            for item in items_data:
                name = (item.get('name') or '').strip()
                if not name:
                    continue
                price = item.get('price', '0')
                try:
                    price_val = Decimal(str(price))
                except Exception:
                    price_val = Decimal('0.00')

                # Check if item provides item-specific category_name
                item_cat_name = (item.get('category_name') or item.get('category') or '').strip()
                target_category = default_category

                if item_cat_name and not item_cat_name.isdigit():
                    if item_cat_name in cat_cache:
                        target_category = cat_cache[item_cat_name]
                    else:
                        from categories.models import Category
                        existing_cat = Category.objects.filter(store=store, name__iexact=item_cat_name).first()
                        if existing_cat:
                            target_category = existing_cat
                        else:
                            base_cat_slug = slugify(item_cat_name)[:50] or 'category'
                            cat_slug = base_cat_slug
                            cat_counter = 1
                            while Category.objects.filter(store=store, slug=cat_slug).exists():
                                cat_slug = f"{base_cat_slug}-{cat_counter}"
                                cat_counter += 1
                            
                            target_category = Category.objects.create(
                                store=store,
                                name=item_cat_name,
                                slug=cat_slug,
                                is_active=True
                            )
                        cat_cache[item_cat_name] = target_category

                base_slug = slugify(name)[:50] or 'product'
                slug = base_slug
                counter = 1
                while slug in existing_slugs:
                    slug = f"{base_slug[:40]}-{counter}"
                    counter += 1

                existing_slugs.add(slug)

                raw_stock = item.get('stock') or item.get('stock_quantity') or item.get('qty') or item.get('quantity') or 100
                try:
                    stock_val = int(raw_stock)
                except Exception:
                    stock_val = 100

                product_obj = Product(
                    store=store,
                    category=target_category,
                    name=name,
                    slug=slug,
                    price=price_val,
                    currency='INR',
                    stock_quantity=stock_val,
                    description=item.get('description', ''),
                    is_published=True
                )

                # 1. Local Image Upload from request.FILES
                image_key = item.get('image_key')
                if image_key and image_key in request.FILES:
                    product_obj.image = request.FILES[image_key]

                # 2. Or Image URL from web link
                elif not product_obj.image:
                    image_url = (item.get('image_url') or item.get('image') or item.get('photo') or item.get('pic') or '').strip()
                    if image_url and (image_url.startswith('http://') or image_url.startswith('https://')):
                        try:
                            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                            with urllib.request.urlopen(req, timeout=5) as resp:
                                if resp.status == 200:
                                    img_data = resp.read()
                                    filename = f"{slug[:40]}.jpg"
                                    product_obj.image.save(filename, ContentFile(img_data), save=False)
                        except Exception as e:
                            print("Failed to download image URL:", e)

                created_objs.append(product_obj)

            if created_objs:
                # Use standard save for models with attached file fields if any
                for p in created_objs:
                    p.save()

        return Response({
            'success': True,
            'created_count': len(created_objs),
            'message': f'Successfully created {len(created_objs)} products, categories and images in 1-Click!'
        }, status=status.HTTP_201_CREATED)
