from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from products.models import Product
from django.db import transaction


class CartView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartSerializer

    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart


class AddCartItemView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartItemSerializer

    @transaction.atomic
    def post(self, request):
        product_id = request.data.get('product')
        quantity = int(request.data.get('quantity', 1))
        if quantity < 1:
            return Response({'detail': 'Quantity must be at least 1.'}, status=status.HTTP_400_BAD_REQUEST)
        product = get_object_or_404(Product, pk=product_id)
        if not product.is_published or not product.store.is_published:
            return Response({'detail': 'This product is not available.'}, status=status.HTTP_404_NOT_FOUND)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        # price snapshot must come from DB
        price = product.price
        item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={'quantity': quantity, 'price_snapshot': price})
        if not created:
            item.quantity = quantity
            item.price_snapshot = price
            item.save()
        serializer = CartItemSerializer(item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RemoveCartItemView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = CartItem.objects.all()
    lookup_field = 'pk'

    def get_object(self):
        obj = super().get_object()
        if obj.cart.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        return obj
