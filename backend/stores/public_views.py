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

class PublicStoreDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicStoreSerializer

    def get_object(self):
        slug = self.kwargs.get('slug')
        store = get_object_or_404(Store, slug=slug, is_published=True)
        Store.objects.filter(id=store.id).update(visits_count=models.F('visits_count') + 1)
        store.refresh_from_db(fields=['visits_count'])
        return store


class PublicStoreCategoriesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        store = get_object_or_404(Store, slug=slug, is_published=True)
        return Category.objects.filter(store=store, is_active=True).order_by('sort_order')


class PublicStoreProductsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicProductSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        store = get_object_or_404(Store, slug=slug, is_published=True)
        qs = Product.objects.filter(store=store, is_published=True)
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
        store = get_object_or_404(Store, slug=store_slug, is_published=True)
        product = get_object_or_404(Product, store=store, slug=product_slug, is_published=True)
        Product.objects.filter(id=product.id).update(views_count=models.F('views_count') + 1)
        product.refresh_from_db(fields=['views_count'])
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
