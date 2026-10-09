from rest_framework import serializers
from django.utils.text import slugify
from .models import Product, ProductImage, ProductVariant
from categories.models import Category


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'created_at')


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ('id', 'size', 'color', 'sku', 'stock_quantity', 'price_override', 'is_active')


class ProductSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'store', 'category', 'name', 'slug', 'short_description', 'description', 'image', 'images', 'price', 'currency', 'unit', 'available_sizes', 'size_stock', 'variants', 'stock_quantity', 'digital_file', 'file_size', 'is_published', 'created_at', 'updated_at')
        read_only_fields = ('file_size', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        """Generate a slug before DRF applies the store/slug uniqueness validator."""
        if not data.get('slug') and data.get('name') and data.get('store'):
            data = data.copy()
            store_id = data.get('store')
            base_slug = slugify(data.get('name'))[:240] or 'product'
            slug = base_slug
            counter = 2
            while Product.objects.filter(store_id=store_id, slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            data['slug'] = slug
        return super().to_internal_value(data)

    def create(self, validated_data):
        store = validated_data['store']
        if not validated_data.get('slug'):
            base_slug = slugify(validated_data['name'])[:240] or 'product'
            slug = base_slug
            counter = 2
            while Product.objects.filter(store=store, slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            validated_data['slug'] = slug
        product = super().create(validated_data)
        self._sync_size_variants(product)
        return product

    def update(self, instance, validated_data):
        product = super().update(instance, validated_data)
        if 'available_sizes' in validated_data or 'size_stock' in validated_data:
            self._sync_size_variants(product)
        return product

    @staticmethod
    def _sync_size_variants(product):
        active_sizes = set(product.available_sizes or [])
        for size in active_sizes:
            ProductVariant.objects.update_or_create(
                product=product, size=size, color='',
                defaults={
                    'stock_quantity': max(0, int((product.size_stock or {}).get(size, 0))),
                    'is_active': True,
                    'sku': f'{product.id}-{size}'.replace(' ', '-').upper(),
                },
            )
        ProductVariant.objects.filter(product=product, color='').exclude(size__in=active_sizes).update(is_active=False)

    def validate_price(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Price must be greater than ₹0.')
        return value

    def validate_available_sizes(self, value):
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except (TypeError, ValueError):
                value = [part.strip() for part in value.split(',') if part.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError('Available sizes must be a list.')
        cleaned = []
        for raw_size in value:
            size = str(raw_size).strip().upper()
            if not size or len(size) > 30:
                continue
            if size not in cleaned:
                cleaned.append(size)
        if len(cleaned) > 30:
            raise serializers.ValidationError('A product can have at most 30 sizes.')
        return cleaned

    def validate_size_stock(self, value):
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Size stock must be a valid object.')
        if not isinstance(value, dict):
            raise serializers.ValidationError('Size stock must be an object such as {"M": 5, "L": 8}.')
        cleaned = {}
        for raw_size, raw_quantity in value.items():
            size = str(raw_size).strip().upper()
            try:
                quantity = int(raw_quantity)
            except (TypeError, ValueError):
                raise serializers.ValidationError(f'Invalid stock for size {size}.')
            if not size or len(size) > 30 or quantity < 0:
                raise serializers.ValidationError(f'Invalid stock for size {size or "unknown"}.')
            cleaned[size] = quantity
        return cleaned

    def validate(self, attrs):
        store = attrs.get('store') or getattr(self.instance, 'store', None)
        category = attrs.get('category')
        name = attrs.get('name')
        available_sizes = attrs.get('available_sizes', getattr(self.instance, 'available_sizes', []))
        size_stock = attrs.get('size_stock', getattr(self.instance, 'size_stock', {}))

        # Mandatory checks for creating new products
        if not self.instance:
            if not name or not name.strip():
                raise serializers.ValidationError({'name': 'Product name is required.'})
            if not category:
                raise serializers.ValidationError({'category': 'Category is required. Please select a valid category.'})

        if category and store and category.store != store:
            raise serializers.ValidationError({'category': 'Category must belong to the same store as the product.'})
        if available_sizes:
            missing = [size for size in available_sizes if size not in size_stock]
            extra = [size for size in size_stock if size not in available_sizes]
            if missing:
                raise serializers.ValidationError({'size_stock': f'Stock is required for sizes: {", ".join(missing)}.'})
            if extra:
                raise serializers.ValidationError({'size_stock': f'Unknown sizes in stock: {", ".join(extra)}.'})
            attrs['stock_quantity'] = sum(int(size_stock[size]) for size in available_sizes)
        return attrs


class PublicProductSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'slug', 'short_description', 'description', 'image', 'images', 'price', 'currency', 'unit', 'available_sizes', 'size_stock', 'variants', 'stock_quantity', 'category')

    def get_category(self, obj):
        if obj.category:
            return {'id': obj.category.id, 'name': obj.category.name, 'slug': obj.category.slug}
        return None


class CouponSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all(), required=False, allow_null=True)

    class Meta:
        from .models import Coupon
        model = Coupon
        fields = ('id', 'store', 'product', 'product_id', 'product_name', 'code', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount', 'is_active', 'usage_count', 'valid_until', 'created_at')
        read_only_fields = ('id', 'usage_count', 'created_at')


