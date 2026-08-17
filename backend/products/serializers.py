from rest_framework import serializers
from django.utils.text import slugify
from .models import Product, ProductImage
from categories.models import Category


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'created_at')


class ProductSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'store', 'category', 'name', 'slug', 'short_description', 'description', 'image', 'images', 'price', 'currency', 'stock_quantity', 'digital_file', 'file_size', 'is_published', 'created_at', 'updated_at')
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
        return super().create(validated_data)

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Price must be >= 0')
        return value

    def validate(self, attrs):
        store = attrs.get('store') or getattr(self.instance, 'store', None)
        category = attrs.get('category')
        if category and store and category.store != store:
            raise serializers.ValidationError('Category must belong to the same store as the product')
        return attrs


class PublicProductSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'slug', 'short_description', 'description', 'image', 'images', 'price', 'currency', 'stock_quantity', 'category')

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


