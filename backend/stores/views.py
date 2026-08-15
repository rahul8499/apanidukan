from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Store
from .serializers import StoreSerializer


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user


class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Store.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        store = self.get_object()
        if store.owner != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        store.status = Store.STATUS_PUBLISHED
        store.is_published = True
        store.save()
        return Response({'success': True, 'message': 'Store published'})

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        store = self.get_object()
        
        # Total visits
        total_visits = store.visits_count
        
        # Product views & Top products
        products = store.products.filter(is_published=True)
        total_product_views = sum(p.views_count for p in products)
        top_products = [
            {
                'id': p.id,
                'name': p.name,
                'price': str(p.price),
                'views_count': p.views_count,
                'image': p.image.url if p.image else None
            }
            for p in products.order_by('-views_count')[:6]
        ]
        
        # Orders & Revenue
        orders = store.whatsapp_orders.all()
        total_orders = orders.count()
        total_revenue = sum(float(o.total) for o in orders)
        
        # Unique and Repeat Customers
        customer_counts = {}
        for o in orders:
            key = (o.customer_phone or o.customer_name or '').strip()
            if key:
                customer_counts[key] = customer_counts.get(key, 0) + 1
        
        total_unique_customers = len(customer_counts)
        repeat_customers_count = sum(1 for count in customer_counts.values() if count > 1)
        repeat_customer_rate = round((repeat_customers_count / total_unique_customers * 100), 1) if total_unique_customers > 0 else 0
        
        # Product requests
        product_reqs = store.product_requests.all().order_by('-created_at')
        total_product_requests = product_reqs.count()
        requests_list = [
            {
                'id': r.id,
                'customerName': r.customer_name,
                'customerPhone': r.customer_phone,
                'productName': r.product_name,
                'message': r.message,
                'createdAt': r.created_at
            }
            for r in product_reqs[:10]
        ]
        
        # Search queries
        searches = [
            {
                'id': s.id,
                'query_term': s.query_term,
                'search_count': s.search_count,
                'last_searched_at': s.last_searched_at
            }
            for s in store.search_queries.all().order_by('-search_count')[:20]
        ]
        
        return Response({
            'total_visits': total_visits,
            'total_product_views': total_product_views,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'total_unique_customers': total_unique_customers,
            'repeat_customers_count': repeat_customers_count,
            'repeat_customer_rate': repeat_customer_rate,
            'total_product_requests': total_product_requests,
            'product_requests': requests_list,
            'top_products': top_products,
            'searches': searches
        })

    @action(detail=True, methods=['get'])
    def requests(self, request, pk=None):
        store = self.get_object()
        reqs = store.product_requests.all().order_by('-created_at')[:100]
        data = []
        for r in reqs:
            data.append({
                'id': r.id,
                'customerName': r.customer_name,
                'customerPhone': r.customer_phone,
                'productName': r.product_name,
                'message': r.message,
                'createdAt': r.created_at
            })
        return Response(data)
