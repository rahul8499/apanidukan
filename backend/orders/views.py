from datetime import timedelta
from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core import signing
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from config.websocket import broadcast_order_event_sync
from downloads.models import DownloadToken
from stores.models import Store
from .models import Order, ProductAccess, WhatsAppOrder, CheckoutPhoneVerification
from accounts.services import normalize_phone, verify_msg91_widget_token
from .serializers import (
    OrderSerializer,
    WhatsAppOrderCreateSerializer,
    WhatsAppOrderSerializer,
    WhatsAppOrderStatusUpdateSerializer,
)


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


class PublicCheckoutPhoneOTPSendView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug):
        get_object_or_404(Store, slug=slug, is_published=True)
        phone = normalize_phone(request.data.get('phone_number', ''))
        if len(phone) != 10:
            return Response({'detail': 'Enter a valid 10-digit mobile number.'}, status=status.HTTP_400_BAD_REQUEST)
        # OTP is delivered by the MSG91 Web Widget, matching the login flow.
        return Response({'success': True, 'message': 'OTP sent to your mobile number.'})


class PublicCheckoutPhoneOTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        phone = normalize_phone(request.data.get('phone_number', ''))
        access_token = str(request.data.get('access_token', '')).strip()
        verified = verify_msg91_widget_token(access_token) if access_token else {'success': False}
        verified_phone = normalize_phone(verified.get('data', {}).get('mobile', '')) if verified.get('success') else ''
        if not verified.get('success') or (verified_phone and verified_phone != phone):
            return Response({'detail': 'MSG91 phone verification failed. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        verification = CheckoutPhoneVerification.objects.create(
            store=store, customer_phone=phone, expires_at=timezone.now() + timedelta(minutes=10)
        )
        return Response({
            'success': True, 'message': 'Phone number verified.',
            'verification_token': str(verification.token), 'expires_in_seconds': 600,
        })


class PublicWhatsAppOrderView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug):
        store = get_object_or_404(Store, slug=slug)
        serializer = WhatsAppOrderCreateSerializer(data=request.data, context={'store': store})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        order_data = WhatsAppOrderSerializer(order).data
        
        from stores.models import SellerNotification
        order_ref = order.reference or order.id
        SellerNotification.objects.create(
            store=store,
            notification_type='order',
            title=f"🛍️ New Order #{order_ref}",
            body=f"Total ₹{order.total} by {order.customer_name or 'Customer'} ({order.customer_phone or 'No phone'})",
            link=f"/stores/{store.id}/orders"
        )
        
        # Broadcast WS event to seller workspace
        broadcast_order_event_sync(f"store_{store.id}", {
            "type": "new_order",
            "order": order_data
        })
        
        return Response(order_data, status=status.HTTP_201_CREATED)


from django.db.models import Q, F


class PublicCustomerOrdersListView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_tracking'

    def get(self, request, slug):
        store = get_object_or_404(Store, slug=slug)
        tokens = [value.strip() for value in request.query_params.get('tracking_tokens', '').split(',') if value.strip()]
        phone = request.query_params.get('phone', '').strip()
        cleaned_phone = ''.join(filter(str.isdigit, phone)) if phone else ''

        if not tokens and not cleaned_phone:
            return Response([])

        filters = Q()
        if tokens:
            filters |= Q(tracking_token__in=tokens)
        if cleaned_phone and len(cleaned_phone) >= 7:
            filters |= Q(customer_phone__icontains=cleaned_phone[-10:])

        queryset = WhatsAppOrder.objects.filter(store=store).filter(filters).distinct().order_by('-created_at')[:50]
        serializer = WhatsAppOrderSerializer(queryset, many=True)
        return Response(serializer.data)


class PublicCustomerOrdersVerifyPhoneView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_tracking'

    def post(self, request):
        phone = normalize_phone(request.data.get('phone_number', ''))
        access_token = str(request.data.get('access_token', '')).strip()
        verified = verify_msg91_widget_token(access_token) if access_token else {'success': False}
        verified_phone = normalize_phone(verified.get('data', {}).get('mobile', '')) if verified.get('success') else ''
        if len(phone) != 10 or not verified.get('success') or (verified_phone and verified_phone != phone):
            return Response({'detail': 'Mobile verification failed.'}, status=status.HTTP_400_BAD_REQUEST)
        customer_token = signing.dumps({'phone': phone}, salt='customer-orders')
        return Response({'success': True, 'customer_token': customer_token, 'expires_in_seconds': 86400})


class PublicCustomerAllOrdersView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_tracking'

    def get(self, request):
        token = request.query_params.get('customer_token', '').strip()
        try:
            payload = signing.loads(token, salt='customer-orders', max_age=86400)
            phone = normalize_phone(payload.get('phone', ''))
        except (signing.BadSignature, signing.SignatureExpired, AttributeError, TypeError):
            return Response({'detail': 'Customer verification expired. Please verify your mobile again.'}, status=status.HTTP_401_UNAUTHORIZED)

        orders = WhatsAppOrder.objects.filter(customer_phone__icontains=phone[-10:]).select_related('store').order_by('-created_at')[:100]
        data = []
        for order in orders:
            serialized = WhatsAppOrderSerializer(order).data
            serialized['store_name'] = order.store.name
            serialized['store_slug'] = order.store.slug
            data.append(serialized)
        return Response(data)



class PublicWhatsAppOrderDetailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_tracking'

    def get(self, request, slug, reference):
        store = get_object_or_404(Store, slug=slug)
        token = request.query_params.get('tracking_token', '').strip()
        order = get_object_or_404(WhatsAppOrder, store=store, reference=reference, tracking_token=token)
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
        token = request.data.get('tracking_token', '').strip()
        previous_order = get_object_or_404(WhatsAppOrder, store=store, reference=reference, tracking_token=token)

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


from decimal import Decimal
from django.db import transaction
from products.models import Product
from .models import CustomerWallet


def cancel_whatsapp_order(order, cancelled_by='CUSTOMER', reason=''):
    """Atomic helper to cancel order, restore product stock & revert customer loyalty points."""
    if order.status == WhatsAppOrder.STATUS_CANCELLED:
        return order

    with transaction.atomic():
        order.status = WhatsAppOrder.STATUS_CANCELLED
        order.cancellation_reason = reason or ('Cancelled by customer' if cancelled_by == 'CUSTOMER' else 'Cancelled by seller')
        order.cancelled_by = cancelled_by
        order.save(update_fields=['status', 'cancellation_reason', 'cancelled_by', 'updated_at'])

        # 1. Restore product stock
        if isinstance(order.items, list):
            for item in order.items:
                product_id = item.get('product_id') or item.get('id')
                qty = item.get('quantity', 1)
                if product_id:
                    Product.objects.filter(id=product_id).update(stock_quantity=models.F('stock_quantity') + qty)

        # 2. Revert Customer Wallet points & cashback
        if order.customer_phone:
            wallet = CustomerWallet.objects.filter(store=order.store, customer_phone=order.customer_phone).first()
            if wallet:
                wallet_updated = False
                # Refund spent coins back to wallet
                if order.wallet_points_redeemed and Decimal(str(order.wallet_points_redeemed)) > Decimal('0.00'):
                    wallet.balance = wallet.balance + Decimal(str(order.wallet_points_redeemed))
                    wallet.total_redeemed = max(Decimal('0.00'), wallet.total_redeemed - Decimal(str(order.wallet_points_redeemed)))
                    wallet_updated = True
                # Revoke unearned cashback
                if order.wallet_cashback_earned and Decimal(str(order.wallet_cashback_earned)) > Decimal('0.00'):
                    wallet.balance = max(Decimal('0.00'), wallet.balance - Decimal(str(order.wallet_cashback_earned)))
                    wallet.total_earned = max(Decimal('0.00'), wallet.total_earned - Decimal(str(order.wallet_cashback_earned)))
                    wallet_updated = True
                if wallet_updated:
                    wallet.save()

    return order


class PublicCustomerCancelOrderView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug, reference):
        store = get_object_or_404(Store, slug=slug)
        token = request.data.get('tracking_token', '').strip() or request.query_params.get('tracking_token', '').strip()
        phone = normalize_phone(request.data.get('phone', '').strip())

        order = WhatsAppOrder.objects.filter(store=store, reference=reference).first()
        if not order:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Security check: matching tracking_token or customer_phone
        token_valid = bool(token and str(order.tracking_token) == token)
        phone_valid = bool(phone and normalize_phone(order.customer_phone) == phone)

        if not (token_valid or phone_valid):
            return Response({'detail': 'Unauthorized to cancel this order.'}, status=status.HTTP_403_FORBIDDEN)

        if order.status == WhatsAppOrder.STATUS_CANCELLED:
            return Response({'detail': 'This order is already cancelled.', 'order': WhatsAppOrderSerializer(order).data})

        if order.status == WhatsAppOrder.STATUS_DELIVERED:
            return Response({'detail': 'Delivered orders cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get('cancellation_reason', '')).strip() or 'Cancelled by customer'
        
        updated_order = cancel_whatsapp_order(order, cancelled_by='CUSTOMER', reason=reason)
        order_data = WhatsAppOrderSerializer(updated_order).data

        # Notify Seller
        from stores.models import SellerNotification
        SellerNotification.objects.create(
            store=store,
            notification_type='order',
            title=f"❌ Order #{order.reference} Cancelled by Customer",
            body=f"Customer {order.customer_name or order.customer_phone or 'Buyer'} cancelled order #{order.reference}. Reason: {reason}",
            link=f"/stores/{store.id}/orders"
        )

        # Broadcast WS updates to tracking & seller dashboard
        broadcast_order_event_sync(f"order_{updated_order.reference}", {
            "type": "order_status_updated",
            "order": order_data
        })
        broadcast_order_event_sync(f"store_{store.id}", {
            "type": "order_status_updated",
            "order": order_data
        })

        return Response({
            'success': True,
            'message': 'Order cancelled successfully.',
            'order': order_data
        })


class SellerWhatsAppOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_store(self, request, store_id):
        if request.user and request.user.is_staff:
            return get_object_or_404(Store, id=store_id)
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
        new_status = request.data.get('status')
        reason = request.data.get('cancellation_reason', '')

        if new_status == WhatsAppOrder.STATUS_CANCELLED and order.status != WhatsAppOrder.STATUS_CANCELLED:
            updated_order = cancel_whatsapp_order(order, cancelled_by='SELLER', reason=reason or 'Cancelled by seller')
        else:
            payload_keys = set(request.data.keys()) - {'cancellation_reason'}
            if payload_keys != {'status'}:
                return Response({'detail': 'Only order status can be updated.'}, status=status.HTTP_400_BAD_REQUEST)
            serializer = WhatsAppOrderStatusUpdateSerializer(order, data={'status': new_status})
            serializer.is_valid(raise_exception=True)
            updated_order = serializer.save()

        order_data = WhatsAppOrderSerializer(updated_order).data

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

