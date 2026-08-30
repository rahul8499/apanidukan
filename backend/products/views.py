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
from .models import Product, ProductImage
from .serializers import ProductSerializer, ProductImageSerializer

import uuid
import os
from rest_framework.views import APIView
from storage import get_storage
from config.websocket import broadcast_order_event_sync


class PresignedUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        filename = request.data.get('filename') or request.data.get('name') or f"image_{uuid.uuid4().hex[:8]}.jpg"
        content_type = request.data.get('content_type') or request.data.get('file_type') or 'image/jpeg'
        folder = request.data.get('folder', 'products/images').strip('/')

        ext = os.path.splitext(filename)[1] or '.jpg'
        unique_name = f"{folder}/{uuid.uuid4().hex}{ext}"

        storage = get_storage()
        if hasattr(storage, 'get_presigned_upload_url'):
            res = storage.get_presigned_upload_url(unique_name, content_type=content_type, expires=3600)
            return Response({'success': True, **res})
        else:
            return Response({
                'success': True,
                'upload_url': None,
                'file_url': storage.url(unique_name),
                'key': unique_name,
                'storage': 'local',
                'expires_in': 3600
            })



class IsStoreOwner(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        return obj.store.owner == request.user


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user and self.request.user.is_staff:
            return Product.objects.all()
        return Product.objects.filter(store__owner=self.request.user)

    def perform_create(self, serializer):
        store = serializer.validated_data.get('store')
        if not store or store.owner != self.request.user:
            raise PermissionDenied('You can only add products to your own store.')

        # Save product (photos are optional)
        uploaded_files = self.request.FILES.getlist('images') or self.request.FILES.getlist('extra_images')
        product = serializer.save()

        # Handle multiple uploaded image files
        for idx, img_file in enumerate(uploaded_files):
            ProductImage.objects.create(product=product, image=img_file)
            if idx == 0 and not product.image:
                product.image = img_file
                product.save(update_fields=['image'])

        # Also check indexed image keys (e.g. image_0, image_1)
        for key in self.request.FILES:
            if key.startswith('image_') or key.startswith('extra_image_'):
                img_file = self.request.FILES[key]
                ProductImage.objects.create(product=product, image=img_file)

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
        product = serializer.save()

        # Handle deletion of specific gallery images if requested
        delete_ids = self.request.data.getlist('delete_image_ids') if hasattr(self.request.data, 'getlist') else self.request.data.get('delete_image_ids', [])
        if isinstance(delete_ids, str):
            try:
                delete_ids = json.loads(delete_ids)
            except Exception:
                delete_ids = [x.strip() for x in delete_ids.split(',') if x.strip()]
        if delete_ids:
            ProductImage.objects.filter(product=product, id__in=delete_ids).delete()

        # Handle multiple uploaded image files on update
        uploaded_files = self.request.FILES.getlist('images') or self.request.FILES.getlist('extra_images')
        for img_file in uploaded_files:
            ProductImage.objects.create(product=product, image=img_file)

        for key in self.request.FILES:
            if key.startswith('extra_image_') or key.startswith('gallery_image_'):
                img_file = self.request.FILES[key]
                ProductImage.objects.create(product=product, image=img_file)

    def get_permissions(self):
        if self.action in ['retrieve', 'list']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=['post', 'delete', 'patch'], url_path='images')
    def manage_product_images(self, request, pk=None):
        product = self.get_object()

        if request.method == 'PATCH' or (request.method == 'POST' and request.data.get('action') == 'set_primary'):
            image_id = request.data.get('image_id') or request.data.get('set_primary_id')
            if image_id:
                pi = ProductImage.objects.filter(product=product, id=image_id).first()
                if pi and pi.image:
                    product.image = pi.image
                    product.save(update_fields=['image'])
                    return Response({'success': True, 'message': 'Primary card image updated!', 'product': ProductSerializer(product).data})
            return Response({'detail': 'Valid image_id required to set as primary.'}, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'POST':
            images = request.FILES.getlist('images') or request.FILES.getlist('image')
            created = []
            for idx, img in enumerate(images):
                pi = ProductImage.objects.create(product=product, image=img)
                created.append(ProductImageSerializer(pi).data)
                if (idx == 0 and not product.image) or request.data.get('set_primary') == 'true':
                    product.image = pi.image
                    product.save(update_fields=['image'])
            return Response({'success': True, 'images': created, 'product': ProductSerializer(product).data}, status=status.HTTP_201_CREATED)

        elif request.method == 'DELETE':
            image_id = request.data.get('image_id')
            if image_id:
                ProductImage.objects.filter(product=product, id=image_id).delete()
                return Response({'success': True, 'deleted_id': image_id})
            return Response({'detail': 'image_id required.'}, status=status.HTTP_400_BAD_REQUEST)


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

                raw_unit = (item.get('unit') or item.get('ordering_unit') or item.get('sales_unit') or '').strip()

                product_obj = Product(
                    store=store,
                    category=target_category,
                    name=name,
                    slug=slug,
                    price=price_val,
                    currency='INR',
                    unit=raw_unit if raw_unit else ('Plate' if store.business_type == 'HOTEL_RESTAURANT' else ('Kg' if store.business_type in ['KIRANA', 'DAIRY_SWEETS'] else ('Strip' if store.business_type == 'PHARMACY' else 'Pc'))),
                    stock_quantity=stock_val,
                    description=item.get('description', ''),
                    is_published=True
                )

                # Primary & Multiple Images Extraction
                image_urls_raw = item.get('images') or item.get('image_urls') or item.get('image_list') or item.get('photos') or []
                if isinstance(image_urls_raw, str):
                    image_urls_list = [x.strip() for x in image_urls_raw.split(',') if x.strip()]
                elif isinstance(image_urls_raw, list):
                    image_urls_list = image_urls_raw
                else:
                    image_urls_list = []

                # Add primary image_url if provided
                primary_url = (item.get('image_url') or item.get('image') or item.get('photo') or item.get('pic') or '').strip()
                if primary_url and primary_url not in image_urls_list:
                    image_urls_list.insert(0, primary_url)

                # Local image keys check (single or array of keys)
                raw_image_keys = item.get('image_keys') or item.get('image_key_list') or ([item.get('image_key')] if item.get('image_key') else [])
                if isinstance(raw_image_keys, str):
                    raw_image_keys = [raw_image_keys]
                
                file_objs = [request.FILES[k] for k in raw_image_keys if k in request.FILES]
                if file_objs:
                    product_obj.image = file_objs[0]
                elif image_urls_list:
                    first_url = image_urls_list[0]
                    if first_url.startswith('http://') or first_url.startswith('https://'):
                        try:
                            req = urllib.request.Request(first_url, headers={'User-Agent': 'Mozilla/5.0'})
                            with urllib.request.urlopen(req, timeout=5) as resp:
                                if resp.status == 200:
                                    img_data = resp.read()
                                    filename = f"{slug[:40]}.jpg"
                                    product_obj.image.save(filename, ContentFile(img_data), save=False)
                        except Exception as e:
                            print("Failed primary image URL download:", e)

                created_objs.append((product_obj, image_urls_list, file_objs[1:] if len(file_objs) > 1 else []))

            if created_objs:
                for p, img_urls, extra_files in created_objs:
                    p.save()
                    # Process extra local binary files into ProductImage gallery
                    for extra_f in extra_files:
                        ProductImage.objects.create(product=p, image=extra_f)

                    # Process secondary gallery images from URLs
                    for idx, img_url in enumerate(img_urls):
                        if img_url.startswith('http://') or img_url.startswith('https://'):
                            try:
                                req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
                                with urllib.request.urlopen(req, timeout=5) as resp:
                                    if resp.status == 200:
                                        img_data = resp.read()
                                        filename = f"{p.slug[:35]}_gal_{idx}.jpg"
                                        pi = ProductImage(product=p)
                                        pi.image.save(filename, ContentFile(img_data), save=True)
                            except Exception as e:
                                print("Failed gallery image download:", e)

        return Response({
            'success': True,
            'created_count': len(created_objs),
            'message': f'Successfully created {len(created_objs)} products with multiple gallery images!'
        }, status=status.HTTP_201_CREATED)


class CouponViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CouponSerializer
        return CouponSerializer

    def get_queryset(self):
        from .models import Coupon
        return Coupon.objects.filter(store__owner=self.request.user)

    def perform_create(self, serializer):
        from .models import Coupon
        store_id = self.request.data.get('store')
        if not store_id:
            store = Store.objects.filter(owner=self.request.user).first()
        else:
            store = get_object_or_404(Store, id=store_id, owner=self.request.user)
        
        if not store:
            raise PermissionDenied('No valid store found for this user.')

        code = self.request.data.get('code', '').strip().upper()
        if not code:
            raise ValidationError({'code': 'Coupon code is required.'})

        serializer.save(store=store, code=code)

