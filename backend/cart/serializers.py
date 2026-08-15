from rest_framework import serializers
from .models import Cart, CartItem
from products.serializers import ProductSerializer
from products.models import Product


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_detail', 'quantity', 'price_snapshot', 'created_at')

    def get_product_detail(self, obj):
        return {'id': obj.product.id, 'name': obj.product.name, 'slug': obj.product.slug}


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True)

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'updated_at')
        read_only_fields = ('user',)
