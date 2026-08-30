from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import StoreSerializer, StoreScratchConfigSerializer, SellerNotificationSerializer
from .models import Store, StoreScratchConfig, SellerNotification


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user


class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user and self.request.user.is_staff:
            return Store.objects.all()
        return Store.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        if 'is_published' in request.data and str(request.data['is_published']).lower() == 'false':
            from orders.models import WhatsAppOrder, Order
            has_active_wa_orders = instance.whatsapp_orders.filter(
                status__in=[WhatsAppOrder.STATUS_NEW, WhatsAppOrder.STATUS_CONFIRMED, WhatsAppOrder.STATUS_PAID]
            ).exists()
            has_active_orders = instance.orders.filter(
                status__in=[Order.STATUS_PENDING, Order.STATUS_PAID]
            ).exists()
            
            if has_active_wa_orders or has_active_orders:
                return Response(
                    {'detail': 'Resolve all pending or paid customer orders before switching the store to Draft mode.'}, 
                    status=status.HTTP_409_CONFLICT
                )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

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
        orders = store.whatsapp_orders.all().order_by('-created_at')
        total_orders = orders.count()
        total_revenue = sum(float(o.total) for o in orders)
        
        # Real Customer Demographics & Loyalty Breakdown
        customers_map = {}
        for o in orders:
            phone = (o.customer_phone or '').strip()
            name = (o.customer_name or '').strip()
            key = phone or name or f"customer_{o.id}"
            
            if key not in customers_map:
                customers_map[key] = {
                    'name': name or 'Customer',
                    'phone': phone,
                    'orders_count': 0,
                    'total_spent': 0.0,
                    'first_order_date': o.created_at,
                    'last_order_date': o.created_at,
                }
            
            c = customers_map[key]
            c['orders_count'] += 1
            c['total_spent'] += float(o.total or 0)
            if o.created_at < c['first_order_date']:
                c['first_order_date'] = o.created_at
            if o.created_at > c['last_order_date']:
                c['last_order_date'] = o.created_at

        total_unique_customers = len(customers_map)
        repeat_customers_count = sum(1 for c in customers_map.values() if c['orders_count'] > 1)
        new_customers_count = max(0, total_unique_customers - repeat_customers_count)
        repeat_customer_rate = round((repeat_customers_count / total_unique_customers * 100), 1) if total_unique_customers > 0 else 0
        avg_customer_value = round((total_revenue / total_unique_customers), 2) if total_unique_customers > 0 else 0

        # Sort top customers by total spent and order volume
        top_customers = sorted(customers_map.values(), key=lambda x: (x['total_spent'], x['orders_count']), reverse=True)[:25]
        
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
            'new_customers_count': new_customers_count,
            'repeat_customers_count': repeat_customers_count,
            'repeat_customer_rate': repeat_customer_rate,
            'avg_customer_value': avg_customer_value,
            'top_customers': top_customers,
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

    @action(detail=True, methods=['get', 'patch'])
    def scratch_config(self, request, pk=None):
        store = self.get_object()
        config, _ = StoreScratchConfig.objects.get_or_create(store=store)
        if request.method == 'PATCH':
            serializer = StoreScratchConfigSerializer(config, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer = StoreScratchConfigSerializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def notifications(self, request, pk=None):
        store = self.get_object()
        if request.method == 'GET':
            notifs = store.notifications.all()[:50]
            return Response(SellerNotificationSerializer(notifs, many=True).data)
        elif request.method == 'POST':
            notif_id = request.data.get('id')
            if notif_id:
                store.notifications.filter(id=notif_id).update(is_read=True)
            else:
                store.notifications.filter(is_read=False).update(is_read=True)
            return Response({'status': 'ok'})
