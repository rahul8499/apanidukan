from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import StoreSerializer, StoreScratchConfigSerializer, SellerNotificationSerializer
from .models import Store, StoreScratchConfig, SellerNotification
from django.conf import settings
from django.core.cache import cache
import requests
from .mappls import mappls_geocode, mappls_reverse_geocode


def _resolve_address_geocoding(address: str):
    """
    Geocode an address:
    1. Check Mappls (if Static Key is configured).
    2. Fall back to OpenStreetMap / Nominatim.
    Returns:
        tuple (result_dict, error_message, http_status_code)
    """
    clean_address = ' '.join(str(address or '').split())
    if len(clean_address) < 3 or len(clean_address) > 500:
        return None, 'Enter a complete shop address (3–500 characters).', status.HTTP_400_BAD_REQUEST

    cache_key = f'geo:address:{clean_address.lower()}'
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}, None, status.HTTP_200_OK

    # 1. Try Mappls first
    try:
        mappls_result = mappls_geocode(clean_address)
        if mappls_result:
            cache.set(cache_key, mappls_result, timeout=60 * 60 * 24 * 30)
            return mappls_result, None, status.HTTP_200_OK
    except Exception:
        pass

    # 2. Fall back to Nominatim OSM
    if not cache.add('nominatim:global-rate-gate', '1', timeout=1):
        return None, 'Please wait a moment and try the address lookup again.', status.HTTP_429_TOO_MANY_REQUESTS

    try:
        response = requests.get(
            f'{settings.NOMINATIM_BASE_URL}/search',
            params={'q': clean_address, 'format': 'jsonv2', 'limit': 1, 'addressdetails': 1},
            headers={'User-Agent': settings.NOMINATIM_USER_AGENT, 'Accept-Language': 'en'},
            timeout=8,
        )
        response.raise_for_status()
        matches = response.json()
    except requests.RequestException:
        return None, 'Address lookup is temporarily unavailable. Use current shop location instead.', status.HTTP_503_SERVICE_UNAVAILABLE

    if not isinstance(matches, list) or not matches:
        return None, 'Address not found. Add area, city, state and PIN code, or use current shop location.', status.HTTP_404_NOT_FOUND

    match = matches[0]
    try:
        result = {
            'latitude': round(float(match['lat']), 6),
            'longitude': round(float(match['lon']), 6),
            'display_name': str(match.get('display_name', clean_address))[:500],
            'source': 'openstreetmap',
        }
        cache.set(cache_key, result, timeout=60 * 60 * 24 * 30)
        return result, None, status.HTTP_200_OK
    except (KeyError, TypeError, ValueError):
        return None, 'Address lookup returned an invalid location. Use current shop location instead.', status.HTTP_503_SERVICE_UNAVAILABLE


def _resolve_reverse_geocoding(latitude: float, longitude: float):
    """
    Reverse geocode coordinates:
    1. Check Mappls (if Static Key is configured).
    2. Fall back to OpenStreetMap / Nominatim.
    Returns:
        tuple (result_dict, error_message, http_status_code)
    """
    try:
        lat = round(float(latitude), 6)
        lng = round(float(longitude), 6)
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return None, 'Invalid GPS coordinates.', status.HTTP_400_BAD_REQUEST
    except (TypeError, ValueError):
        return None, 'Invalid GPS coordinates.', status.HTTP_400_BAD_REQUEST

    cache_key = f'geo:rev:v3:{lat:.6f}:{lng:.6f}'
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}, None, status.HTTP_200_OK

    # 1. Try Mappls first
    try:
        mappls_result = mappls_reverse_geocode(lat, lng)
        if mappls_result:
            cache.set(cache_key, mappls_result, timeout=60 * 60 * 24 * 30)
            return mappls_result, None, status.HTTP_200_OK
    except Exception:
        pass

    # 2. Fall back to Nominatim OSM
    if not cache.add('nominatim:global-rate-gate', '1', timeout=1):
        return None, 'Please wait a moment and try again.', status.HTTP_429_TOO_MANY_REQUESTS

    try:
        response = requests.get(
            f'{settings.NOMINATIM_BASE_URL}/reverse',
            params={'lat': lat, 'lon': lng, 'format': 'jsonv2'},
            headers={'User-Agent': settings.NOMINATIM_USER_AGENT, 'Accept-Language': 'en'},
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        result = {
            'display_name': str(payload.get('display_name', ''))[:500],
            'latitude': lat,
            'longitude': lng,
            'source': 'openstreetmap',
        }
        cache.set(cache_key, result, timeout=60 * 60 * 24 * 30)
        return result, None, status.HTTP_200_OK
    except (requests.RequestException, ValueError):
        return None, 'Address lookup is temporarily unavailable.', status.HTTP_503_SERVICE_UNAVAILABLE


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

    @action(detail=True, methods=['post'], url_path='geocode-address')
    def geocode_address(self, request, pk=None):
        """Geocode a seller-confirmed shop address using Mappls with OSM fallback."""
        store = self.get_object()
        address = ' '.join(str(request.data.get('address', '')).split())
        result, error_msg, status_code = _resolve_address_geocoding(address)
        if error_msg:
            return Response({'detail': error_msg}, status=status_code)
        return Response(result)

    @action(detail=False, methods=['post'], url_path='geocode-address')
    def geocode_address_general(self, request):
        """Allow address geocoding for new stores or account setup before store creation."""
        address = ' '.join(str(request.data.get('address', '')).split())
        result, error_msg, status_code = _resolve_address_geocoding(address)
        if error_msg:
            return Response({'detail': error_msg}, status=status_code)
        return Response(result)

    @action(detail=True, methods=['post'], url_path='reverse-geocode')
    def reverse_geocode(self, request, pk=None):
        """Resolve a seller GPS point using Mappls with OSM fallback."""
        self.get_object()
        try:
            latitude = round(float(request.data.get('latitude')), 6)
            longitude = round(float(request.data.get('longitude')), 6)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid GPS coordinates.'}, status=status.HTTP_400_BAD_REQUEST)
        result, error_msg, status_code = _resolve_reverse_geocoding(latitude, longitude)
        if error_msg:
            return Response({'detail': error_msg}, status=status_code)
        return Response(result)

    @action(detail=False, methods=['post'], url_path='reverse-geocode')
    def reverse_geocode_general(self, request):
        """Allow reverse geocoding for new store registration before store creation."""
        try:
            latitude = round(float(request.data.get('latitude')), 6)
            longitude = round(float(request.data.get('longitude')), 6)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid GPS coordinates.'}, status=status.HTTP_400_BAD_REQUEST)
        result, error_msg, status_code = _resolve_reverse_geocoding(latitude, longitude)
        if error_msg:
            return Response({'detail': error_msg}, status=status_code)
        return Response(result)

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
