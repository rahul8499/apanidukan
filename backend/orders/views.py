from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from config.websocket import broadcast_order_event_sync
from downloads.models import DownloadToken
from stores.models import Store
from .models import Order, ProductAccess, WhatsAppOrder
from .serializers import OrderSerializer, WhatsAppOrderCreateSerializer, WhatsAppOrderSerializer


class CreateOrderView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['customer'] = request.user.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(customer=request.user)
        try:
            broadcast_order_event_sync(f"store_{order.store.id}", {
                "type": "new_order",
                "order": OrderSerializer(order).data
            })
        except Exception:
            pass
        return Response({'success': True, 'order_id': order.id}, status=status.HTTP_201_CREATED)


class ListOrdersView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.all()

    def get_object(self):
        obj = super().get_object()
        if obj.customer != self.request.user and obj.store.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        return obj


class ListAccessesView(APIView):
    def get(self, request):
        accesses = ProductAccess.objects.filter(customer=request.user, is_active=True)
        results = []
        for a in accesses:
            prod = a.product
            token = DownloadToken.objects.filter(user=request.user, product_id=prod.id, is_active=True).first()
            if not token:
                # create a token tied to product and file path with 30-day expiry
                file_path = prod.digital_file.name if prod.digital_file else ''
                token = DownloadToken.objects.create(
                    user=request.user,
                    product_id=prod.id,
                    file_path=file_path,
                    expires_at=timezone.now() + timedelta(days=30)
                )
            results.append({
                'product_id': prod.id,
                'product_name': prod.name,
                'order_id': a.order.id,
                'granted_at': a.granted_at,
                'expires_at': token.expires_at,
                'download_token': str(token.token),
            })

        return Response(results)


from config.websocket import broadcast_order_event_sync


class PublicWhatsAppOrderView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        serializer = WhatsAppOrderCreateSerializer(data=request.data, context={'store': store})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        order_data = WhatsAppOrderSerializer(order).data
        
        # Broadcast WS event to seller workspace
        broadcast_order_event_sync(f"store_{store.id}", {
            "type": "new_order",
            "order": order_data
        })
        
        return Response(order_data, status=status.HTTP_201_CREATED)


class PublicWhatsAppOrderDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug, reference):
        store = get_object_or_404(Store, slug=slug)
        order = get_object_or_404(WhatsAppOrder, store=store, reference=reference)
        data = WhatsAppOrderSerializer(order).data
        data['store_name'] = store.name
        data['store_phone'] = store.phone_number
        data['manage_in_app'] = store.manage_in_app
        return Response(data)


class PublicQuickReorderView(APIView):
    """Create a fresh WhatsApp order using the items and details of an earlier order."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug, reference):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        previous_order = get_object_or_404(WhatsAppOrder, store=store, reference=reference)

        # Prices and availability are always revalidated by the normal order serializer;
        # never trust the historical item price stored in the old order.
        items = [
            {'id': item.get('product_id'), 'quantity': item.get('quantity', 1)}
            for item in previous_order.items
        ]
        serializer = WhatsAppOrderCreateSerializer(
            data={
                'items': items,
                'customer_name': previous_order.customer_name,
                'customer_phone': previous_order.customer_phone,
                'payment_type': previous_order.payment_type or 'COD',
                'delivery_address': previous_order.delivery_address,
                'location_url': previous_order.location_url,
            },
            context={'store': store},
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        order_data = WhatsAppOrderSerializer(order).data

        broadcast_order_event_sync(f"store_{store.id}", {
            'type': 'new_order',
            'order': order_data,
        })
        return Response(order_data, status=status.HTTP_201_CREATED)


class SellerWhatsAppOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_store(self, request, store_id):
        return get_object_or_404(Store, id=store_id, owner=request.user)

    def get(self, request, store_id):
        store = self.get_store(request, store_id)
        return Response(WhatsAppOrderSerializer(store.whatsapp_orders.all(), many=True).data)

    def patch(self, request, store_id, order_id):
        store = self.get_store(request, store_id)
        if not store.manage_in_app:
            return Response(
                {'detail': "Manage in App is turned OFF for this store. Enable 'Manage in App' in Store Setup to update order statuses."},
                status=status.HTTP_400_BAD_REQUEST
            )
        order = get_object_or_404(WhatsAppOrder, id=order_id, store=store)
        if set(request.data.keys()) != {'status'}:
            return Response({'detail': 'Only order status can be updated.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = WhatsAppOrderSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_order = serializer.save()
        order_data = serializer.data

        # Broadcast real-time status update to customer tracking screen & seller dashboard
        broadcast_order_event_sync(f"order_{updated_order.reference}", {
            "type": "order_status_updated",
            "order": order_data
        })
        broadcast_order_event_sync(f"store_{store.id}", {
            "type": "order_status_updated",
            "order": order_data
        })

        return Response(order_data)


class PublicCustomerWalletView(APIView):
    def get(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        phone = request.query_params.get('phone', '').strip()
        if not phone:
            return Response({'customer_phone': '', 'balance': '0.00', 'total_earned': '0.00', 'total_redeemed': '0.00'})
        wallet, _ = CustomerWallet.objects.get_or_create(
            store=store,
            customer_phone=phone,
            defaults={'balance': Decimal('0.00')}
        )
        return Response({
            'customer_phone': wallet.customer_phone,
            'customer_name': wallet.customer_name,
            'balance': str(wallet.balance),
            'total_earned': str(wallet.total_earned),
            'total_redeemed': str(wallet.total_redeemed),
        })


