from rest_framework import generics, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from stores.models import Store
from .models import Category
from .serializers import CategorySerializer


class IsStoreOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        store_id = view.kwargs.get('store_id')
        if not store_id:
            return False
        if request.user and request.user.is_staff:
            return True
        store = get_object_or_404(Store, pk=store_id)
        return store.owner == request.user


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def get_queryset(self):
        store_id = self.kwargs.get('store_id')
        return Category.objects.filter(store_id=store_id)

    def perform_create(self, serializer):
        store_id = self.kwargs.get('store_id')
        store = get_object_or_404(Store, pk=store_id)
        serializer.save(store=store)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Category.objects.all()

    def get_object(self):
        obj = super().get_object()
        if obj.store.owner != self.request.user and not (self.request.user and self.request.user.is_staff):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        return obj
