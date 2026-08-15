from rest_framework import serializers
from django.utils.text import slugify
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    # Generated from the category name when omitted by the seller form.
    slug = serializers.SlugField(required=False)

    class Meta:
        model = Category
        fields = ('id', 'store', 'name', 'slug', 'description', 'image', 'is_active', 'sort_order', 'created_at', 'updated_at')
        # The store is determined from /stores/<store_id>/categories/ on create.
        read_only_fields = ('store', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        """Generate a slug before DRF applies the store/slug uniqueness validator."""
        if not data.get('slug') and data.get('name'):
            data = data.copy()
            store_id = self.context['view'].kwargs.get('store_id')
            base_slug = slugify(data.get('name'))[:240] or 'category'
            slug = base_slug
            counter = 2
            while Category.objects.filter(store_id=store_id, slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            data['slug'] = slug
        return super().to_internal_value(data)

    def create(self, validated_data):
        store = validated_data['store']
        if not validated_data.get('slug'):
            base_slug = slugify(validated_data['name'])[:240] or 'category'
            slug = base_slug
            counter = 2
            while Category.objects.filter(store=store, slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)

    def validate(self, attrs):
        # Ensure slug uniqueness per store handled by DB constraint; additional checks can be added here.
        return attrs
