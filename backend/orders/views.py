from datetime import timedelta
import secrets
import hashlib
import hmac
from PIL import Image, UnidentifiedImageError
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
from django.db import models, IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core import signing
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from config.websocket import broadcast_order_event_sync
from config.pagination import StandardResultsSetPagination
from config.throttling import PhoneRateThrottle, WhitelistedScopedRateThrottle
from downloads.models import DownloadToken
from stores.models import Store
from .models import (
    Order, ProductAccess, WhatsAppOrder, CheckoutPhoneVerification,
    OrderIssueRequest, OrderStatusEvent, OrderIssueEvidence, OrderDeliveryOTP, OrderIssueCompletionOTP,
)
from accounts.services import normalize_phone, verify_msg91_widget_token, send_msg91_otp
from .serializers import (
    OrderSerializer,
    WhatsAppOrderCreateSerializer,
    WhatsAppOrderSerializer,
    WhatsAppOrderStatusUpdateSerializer,
    OrderIssueRequestSerializer,
)


class CreateOrderView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def create(self, request, *args, **kwargs):
        idempotency_key = request.headers.get('X-Idempotency-Key') or request.data.get('idempotency_key')
        if idempotency_key:
            idempotency_key = str(idempotency_key).strip()[:64]
            if idempotency_key:
                existing_order = Order.objects.filter(
                    idempotency_key=idempotency_key,
                    customer=request.user
                ).first()
                if existing_order:
                    return Response({'success': True, 'order_id': existing_order.id, 'idempotent_replay': True}, status=status.HTTP_200_OK)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['customer'] = request.user.id
        if idempotency_key:
            data['idempotency_key'] = idempotency_key
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        try:
            order = serializer.save(customer=request.user)
        except IntegrityError:
            if idempotency_key:
                existing_order = Order.objects.filter(
                    idempotency_key=idempotency_key,
                    customer=request.user
                ).first()
                if existing_order:
                    return Response({'success': True, 'order_id': existing_order.id, 'idempotent_replay': True}, status=status.HTTP_200_OK)
            raise

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
    throttle_classes = [WhitelistedScopedRateThrottle, PhoneRateThrottle]
    throttle_scope = 'otp'

    def post(self, request, slug):
        get_object_or_404(Store, slug=slug, is_published=True)
        phone = normalize_phone(request.data.get('phone_number', ''))
        if len(phone) != 10:
            return Response({'detail': 'Enter a valid 10-digit mobile number.'}, status=status.HTTP_400_BAD_REQUEST)
        # OTP is delivered by the MSG91 Web Widget, matching the login flow.
        return Response({'success': True, 'message': 'OTP sent to your mobile number.'})


class PublicCheckoutPhoneOTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [WhitelistedScopedRateThrottle]
    throttle_scope = 'otp_verify'

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
        store = get_object_or_404(Store, slug=slug, is_published=True)

        # 1. Idempotency Check: Prevent duplicate orders from network retries or rapid double-clicks
        idempotency_key = request.headers.get('X-Idempotency-Key') or request.data.get('idempotency_key')
        if idempotency_key:
            idempotency_key = str(idempotency_key).strip()[:64]
            if idempotency_key:
                existing_order = WhatsAppOrder.objects.filter(
                    idempotency_key=idempotency_key,
                    store=store
                ).first()
                if existing_order:
                    req_phone = normalize_phone(request.data.get('customer_phone', ''))
                    if req_phone and existing_order.customer_phone and existing_order.customer_phone != req_phone:
                        return Response({'detail': 'Invalid order request.'}, status=status.HTTP_400_BAD_REQUEST)
                    return Response(WhatsAppOrderSerializer(existing_order).data, status=status.HTTP_200_OK)

        data = request.data
        if idempotency_key and isinstance(data, dict) and not data.get('idempotency_key'):
            data = {**data, 'idempotency_key': idempotency_key}

        serializer = WhatsAppOrderCreateSerializer(data=data, context={'store': store})
        serializer.is_valid(raise_exception=True)

        try:
            order = serializer.save()
        except IntegrityError:
            if idempotency_key:
                existing_order = WhatsAppOrder.objects.filter(
                    idempotency_key=idempotency_key,
                    store=store
                ).first()
                if existing_order:
                    return Response(WhatsAppOrderSerializer(existing_order).data, status=status.HTTP_200_OK)
            raise

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

        # Persist alerts before attempting delivery. A worker retries failures.
        from .notification_queue import enqueue_order_notifications, process_notification
        for notification in enqueue_order_notifications(order):
            process_notification(notification.id)
        
        return Response(order_data, status=status.HTTP_201_CREATED)


from django.db.models import Q, F


class PublicCustomerOrdersListView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_tracking'

    def get(self, request, slug):
        store = get_object_or_404(Store, slug=slug)
        tokens = [value.strip() for value in request.query_params.get('tracking_tokens', '').split(',') if value.strip()]
        if not tokens:
            return Response([])

        # Phone numbers are identifiers, not secrets. Order history is returned
        # only for unguessable tracking tokens issued with each order.
        queryset = WhatsAppOrder.objects.filter(
            store=store, tracking_token__in=tokens
        ).distinct().order_by('-created_at')[:50]
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


class PublicCustomerNotificationsView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_tracking'

    def get(self, request):
        token = request.query_params.get('customer_token', '').strip()
        try:
            payload = signing.loads(token, salt='customer-orders', max_age=86400)
            phone = normalize_phone(payload.get('phone', ''))
        except (signing.BadSignature, signing.SignatureExpired, AttributeError, TypeError):
            return Response({'detail': 'Customer verification expired.'}, status=status.HTTP_401_UNAUTHORIZED)

        orders = WhatsAppOrder.objects.filter(customer_phone__icontains=phone[-10:]).select_related('store').order_by('-updated_at')[:100]
        notifications = []
        for order in orders:
            reference = order.reference or str(order.id)
            status_label = str(order.status).replace('_', ' ').title()
            event_time = order.updated_at or order.created_at
            notifications.append({
                'id': f'order-{order.id}-{order.status}-{event_time.timestamp():.0f}',
                'type': 'order',
                'title': f'{order.store.name}: Order #{reference}',
                'body': f'₹{order.total} · {status_label}',
                'created_at': event_time,
                'store_name': order.store.name,
                'store_slug': order.store.slug,
                'link': f'/s/{order.store.slug}/order/{reference}?token={order.tracking_token}',
            })
        return Response(notifications)



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
        delivery_otp = OrderDeliveryOTP.objects.filter(
            order=order, is_verified=False, expires_at__gte=timezone.now()
        ).first()
        if delivery_otp and order.status in (WhatsAppOrder.STATUS_READY_FOR_PICKUP, WhatsAppOrder.STATUS_OUT_FOR_DELIVERY):
            data['delivery_fallback_code'] = delivery_fallback_code(order, delivery_otp)
            data['delivery_fallback_expires_at'] = delivery_otp.expires_at
        exchange_codes = []
        for issue in order.issue_requests.filter(request_type=OrderIssueRequest.TYPE_EXCHANGE, status=OrderIssueRequest.STATUS_PROCESSING):
            issue_otp = OrderIssueCompletionOTP.objects.filter(issue=issue, is_verified=False, expires_at__gte=timezone.now()).first()
            if issue_otp:
                exchange_codes.append({
                    'issue_id': issue.id,
                    'requested_size': issue.requested_size,
                    'code': exchange_fallback_code(issue, issue_otp),
                    'expires_at': issue_otp.expires_at,
                })
        data['exchange_fallback_codes'] = exchange_codes
        return Response(data)


class PublicQuickReorderView(APIView):
    """Rebuild a reviewable cart; checkout still requires fresh OTP verification."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def post(self, request, slug, reference):
        store = get_object_or_404(Store, slug=slug, is_published=True)
        token = request.data.get('tracking_token', '').strip()
        previous_order = get_object_or_404(WhatsAppOrder, store=store, reference=reference, tracking_token=token)

        historical_items = previous_order.items if isinstance(previous_order.items, list) else []
        product_ids = [item.get('product_id') for item in historical_items if item.get('product_id')]
        products = Product.objects.filter(id__in=product_ids, store=store, is_published=True)
        product_map = {product.id: product for product in products}
        cart_items, unavailable = [], []
        for item in historical_items:
            product = product_map.get(item.get('product_id'))
            selected_size = str(item.get('selected_size') or '').strip().upper()
            quantity = max(1, int(item.get('quantity', 1)))
            if not product:
                unavailable.append({'name': item.get('name', 'Product'), 'reason': 'Product is no longer available.'})
                continue
            if product.available_sizes:
                available_for_size = int((product.size_stock or {}).get(selected_size, 0))
                if selected_size not in product.available_sizes or available_for_size < quantity:
                    unavailable.append({
                        'name': product.name,
                        'selected_size': selected_size,
                        'reason': f'Only {available_for_size} available in size {selected_size or "unknown"}.',
                    })
                    continue
            elif product.stock_quantity < quantity:
                unavailable.append({'name': product.name, 'reason': f'Only {product.stock_quantity} available.'})
                continue
            cart_items.append({
                'id': product.id,
                'slug': product.slug,
                'name': product.name,
                'price': str(product.price),
                'image': product.image.url if product.image else '',
                'unit': product.unit,
                'selectedSize': selected_size,
                'selectedSizeStock': int((product.size_stock or {}).get(selected_size, 0)) if selected_size else product.stock_quantity,
                'quantity': quantity,
            })
        if unavailable:
            return Response({
                'detail': 'Some previous items need your attention before reorder.',
                'unavailable_items': unavailable,
                'cart_items': cart_items,
            }, status=status.HTTP_409_CONFLICT)
        return Response({
            'cart_items': cart_items,
            'customer_name': previous_order.customer_name,
            'customer_phone': previous_order.customer_phone,
            'requires_checkout_verification': True,
        })


from decimal import Decimal
from django.db import transaction
from products.models import Product, ProductVariant
from .models import CustomerWallet


def delivery_fallback_code(order, otp_record):
    """Deterministic code derived from secret server state; never stored as plaintext."""
    payload = f'delivery:{order.id}:{otp_record.last_sent_at.isoformat()}'.encode()
    digest = hmac.new(str(settings.SECRET_KEY).encode(), payload, hashlib.sha256).hexdigest()
    return f'{int(digest[:12], 16) % 1000000:06d}'


def exchange_fallback_code(issue, otp_record):
    payload = f'exchange:{issue.id}:{otp_record.last_sent_at.isoformat()}'.encode()
    digest = hmac.new(str(settings.SECRET_KEY).encode(), payload, hashlib.sha256).hexdigest()
    return f'{int(digest[:12], 16) % 1000000:06d}'


def cancel_whatsapp_order(order, cancelled_by='CUSTOMER', reason='', actor_id=''):
    """Atomic helper to cancel order, restore product stock & revert customer loyalty points."""
    if order.status == WhatsAppOrder.STATUS_CANCELLED:
        return order

    with transaction.atomic():
        previous_status = order.status
        order.status = WhatsAppOrder.STATUS_CANCELLED
        order.cancellation_reason = reason or ('Cancelled by customer' if cancelled_by == 'CUSTOMER' else 'Cancelled by seller')
        order.cancelled_by = cancelled_by
        order.save(update_fields=['status', 'cancellation_reason', 'cancelled_by', 'updated_at'])
        OrderStatusEvent.objects.create(
            order=order, from_status=previous_status, to_status=order.status,
            actor_type=cancelled_by, actor_id=str(actor_id), note=order.cancellation_reason,
        )

        # 1. Restore product stock
        if isinstance(order.items, list):
            for item in order.items:
                product_id = item.get('product_id') or item.get('id')
                qty = item.get('quantity', 1)
                if product_id:
                    product = Product.objects.select_for_update().filter(id=product_id).first()
                    if not product:
                        continue
                    selected_size = str(item.get('selected_size') or '').strip().upper()
                    if selected_size and product.available_sizes:
                        size_stock = dict(product.size_stock or {})
                        size_stock[selected_size] = int(size_stock.get(selected_size, 0)) + int(qty)
                        product.size_stock = size_stock
                        variant = ProductVariant.objects.select_for_update().filter(
                            product=product, size=selected_size, color='', is_active=True
                        ).first()
                        if variant:
                            variant.stock_quantity += int(qty)
                            variant.save(update_fields=['stock_quantity', 'updated_at'])
                    product.stock_quantity = models.F('stock_quantity') + int(qty)
                    update_fields = ['stock_quantity']
                    if selected_size and product.available_sizes:
                        update_fields.append('size_stock')
                    product.save(update_fields=update_fields)

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
        if order.status == WhatsAppOrder.STATUS_PAID or order.payment_verified:
            return Response(
                {'detail': 'Paid orders require a refund request and cannot be cancelled directly.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        # No cron dependency: while the seller app is active, process one due
        # retry per refresh. Persistent outbox state prevents lost messages.
        try:
            from .notification_queue import process_due_notifications
            process_due_notifications(limit=1)
        except Exception:
            pass
        paginator = StandardResultsSetPagination()
        qs = store.whatsapp_orders.select_related('store').order_by('-created_at')
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = WhatsAppOrderSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        return Response(WhatsAppOrderSerializer(qs, many=True).data)

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
            if order.status == WhatsAppOrder.STATUS_PAID or order.payment_verified:
                return Response(
                    {'detail': 'Paid orders require a refund workflow and cannot be cancelled directly.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            updated_order = cancel_whatsapp_order(order, cancelled_by='SELLER', reason=reason or 'Cancelled by seller')
        else:
            previous_status = order.status
            allowed_fields = {'status', 'expected_dispatch_at', 'delivery_agent_name', 'delivery_agent_phone'}
            if set(request.data.keys()) - allowed_fields:
                return Response({'detail': 'Unsupported order update fields.'}, status=status.HTTP_400_BAD_REQUEST)
            serializer = WhatsAppOrderStatusUpdateSerializer(order, data={key: request.data.get(key) for key in allowed_fields if key in request.data})
            serializer.is_valid(raise_exception=True)
            updated_order = serializer.save()
            OrderStatusEvent.objects.create(
                order=updated_order, from_status=previous_status, to_status=updated_order.status,
                actor_type='SELLER', actor_id=str(request.user.id),
            )

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


class PublicOrderIssueRequestView(APIView):
    """Customer return/exchange/refund requests secured by the order tracking token."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'public_order'

    def get_order(self, slug, reference, token):
        store = get_object_or_404(Store, slug=slug)
        return get_object_or_404(
            WhatsAppOrder, store=store, reference=reference, tracking_token=token,
        )

    def get(self, request, slug, reference):
        order = self.get_order(slug, reference, request.query_params.get('tracking_token', '').strip())
        return Response(OrderIssueRequestSerializer(order.issue_requests.all(), many=True, context={'request': request}).data)

    def post(self, request, slug, reference):
        token = str(request.data.get('tracking_token', '')).strip()
        order = self.get_order(slug, reference, token)
        serializer = OrderIssueRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        request_type = data['request_type']

        if request_type == OrderIssueRequest.TYPE_EXCHANGE and not order.store.exchange_enabled:
            return Response({'detail': 'This store does not currently offer exchanges.'}, status=400)

        if request_type in (OrderIssueRequest.TYPE_RETURN, OrderIssueRequest.TYPE_EXCHANGE):
            if order.status != WhatsAppOrder.STATUS_DELIVERED:
                return Response({'detail': 'Return or exchange is available only after delivery.'}, status=400)
            window_days = order.store.exchange_window_days if request_type == OrderIssueRequest.TYPE_EXCHANGE else 7
            delivered_at = getattr(order, 'delivered_at', None) or order.updated_at
            if delivered_at < timezone.now() - timedelta(days=window_days):
                return Response({'detail': f'The {window_days}-day exchange window has expired.'}, status=400)
        elif request_type == OrderIssueRequest.TYPE_REFUND:
            if not (order.payment_verified or order.status == WhatsAppOrder.STATUS_PAID):
                return Response({'detail': 'Refund requests are available only for verified paid orders.'}, status=400)

        product_id = data.get('product_id')
        selected_size = str(data.get('selected_size') or '').strip().upper()
        quantity = data.get('quantity', 1)
        matching_item = next((item for item in (order.items or []) if
            str(item.get('product_id') or item.get('id')) == str(product_id) and
            str(item.get('selected_size') or '').strip().upper() == selected_size), None)
        if not matching_item or quantity > int(matching_item.get('quantity', 1)):
            return Response({'detail': 'Select a valid ordered item and quantity.'}, status=400)

        requested_size = str(data.get('requested_size') or '').strip().upper()
        if request_type == OrderIssueRequest.TYPE_EXCHANGE:
            allowed_reasons = order.store.exchange_allowed_reasons or []
            if allowed_reasons and data.get('reason') not in allowed_reasons:
                return Response({'detail': 'Select one of the exchange reasons configured by this store.'}, status=400)
            evidence_files = request.FILES.getlist('evidence')
            if order.store.exchange_evidence_required and not evidence_files:
                return Response({'detail': 'Photo evidence is required by this store.'}, status=400)
            if len(evidence_files) > 3:
                return Response({'detail': 'Upload a maximum of 3 evidence photos.'}, status=400)
            for upload in evidence_files:
                if upload.size > 5 * 1024 * 1024 or upload.content_type not in ('image/jpeg', 'image/png', 'image/webp'):
                    return Response({'detail': 'Each evidence photo must be JPG, PNG or WebP and no larger than 5 MB.'}, status=400)
                try:
                    Image.open(upload).verify()
                    upload.seek(0)
                except (UnidentifiedImageError, OSError, ValueError):
                    return Response({'detail': 'One of the evidence files is not a valid image.'}, status=400)
            variant = ProductVariant.objects.filter(
                product_id=product_id, size=requested_size, color='', is_active=True,
                stock_quantity__gte=quantity,
            ).first()
            if not variant or requested_size == selected_size:
                return Response({'detail': 'Choose a different replacement size that is in stock.'}, status=400)

        if order.issue_requests.filter(
            product_id=product_id, selected_size=selected_size,
            status__in=[OrderIssueRequest.STATUS_REQUESTED, OrderIssueRequest.STATUS_APPROVED, OrderIssueRequest.STATUS_PROCESSING],
        ).exists():
            return Response({'detail': 'An open request already exists for this item.'}, status=400)

        issue = serializer.save(
            order=order, customer_phone=order.customer_phone,
            selected_size=selected_size, requested_size=requested_size,
        )
        for upload in request.FILES.getlist('evidence'):
            OrderIssueEvidence.objects.create(issue=issue, image=upload)
        from stores.models import SellerNotification
        SellerNotification.objects.create(
            store=order.store, notification_type='order',
            title=f'{request_type.title()} request · #{order.reference}',
            body=f'{order.customer_name or order.customer_phone}: {issue.reason}',
            link=f'/stores/{order.store_id}/orders',
        )
        return Response(OrderIssueRequestSerializer(issue, context={'request': request}).data, status=201)


class SellerOrderIssueRequestView(SellerWhatsAppOrdersView):
    def get(self, request, store_id, issue_id=None):
        store = self.get_store(request, store_id)
        issues = OrderIssueRequest.objects.filter(order__store=store).select_related('order')
        return Response(OrderIssueRequestSerializer(issues, many=True, context={'request': request}).data)

    def patch(self, request, store_id, issue_id):
        store = self.get_store(request, store_id)
        issue = get_object_or_404(OrderIssueRequest, id=issue_id, order__store=store)
        new_status = str(request.data.get('status', '')).upper()
        allowed = {
            OrderIssueRequest.STATUS_REQUESTED: {OrderIssueRequest.STATUS_APPROVED, OrderIssueRequest.STATUS_REJECTED},
            OrderIssueRequest.STATUS_APPROVED: {OrderIssueRequest.STATUS_PROCESSING, OrderIssueRequest.STATUS_REJECTED},
            OrderIssueRequest.STATUS_PROCESSING: {OrderIssueRequest.STATUS_COMPLETED, OrderIssueRequest.STATUS_FAILED},
        }
        if new_status not in allowed.get(issue.status, set()):
            return Response({'detail': f'Invalid transition from {issue.status} to {new_status}.'}, status=400)

        provider_ref = str(request.data.get('provider_refund_id', '')).strip()
        if new_status == OrderIssueRequest.STATUS_COMPLETED and issue.request_type == OrderIssueRequest.TYPE_REFUND and not provider_ref:
            return Response({'detail': 'Refund transaction/reference ID is required before completion.'}, status=400)
        if new_status == OrderIssueRequest.STATUS_COMPLETED and issue.request_type == OrderIssueRequest.TYPE_EXCHANGE:
            otp = OrderIssueCompletionOTP.objects.filter(issue=issue, is_verified=True).first()
            if not otp or not issue.completion_proof:
                return Response({'detail': 'Verify customer exchange OTP and upload handover proof before completion.'}, status=400)

        with transaction.atomic():
            issue = OrderIssueRequest.objects.select_for_update().get(id=issue.id)
            if new_status == OrderIssueRequest.STATUS_COMPLETED and issue.request_type in (
                OrderIssueRequest.TYPE_RETURN, OrderIssueRequest.TYPE_EXCHANGE,
            ):
                product = get_object_or_404(Product.objects.select_for_update(), id=issue.product_id, store=store)
                old_variant = get_object_or_404(ProductVariant.objects.select_for_update(), product=product, size=issue.selected_size, color='')
                new_variant = None
                if issue.request_type == OrderIssueRequest.TYPE_EXCHANGE:
                    new_variant = ProductVariant.objects.select_for_update().filter(
                        product=product, size=issue.requested_size, color='', is_active=True,
                    ).first()
                    if not new_variant or new_variant.stock_quantity < issue.quantity:
                        return Response({'detail': 'Replacement size stock changed; cannot complete exchange.'}, status=409)
                old_variant.stock_quantity += issue.quantity
                old_variant.save(update_fields=['stock_quantity', 'updated_at'])
                size_stock = dict(product.size_stock or {})
                size_stock[issue.selected_size] = int(size_stock.get(issue.selected_size, 0)) + issue.quantity
                if issue.request_type == OrderIssueRequest.TYPE_EXCHANGE:
                    new_variant.stock_quantity -= issue.quantity
                    new_variant.save(update_fields=['stock_quantity', 'updated_at'])
                    size_stock[issue.requested_size] = max(0, int(size_stock.get(issue.requested_size, 0)) - issue.quantity)
                else:
                    product.stock_quantity = models.F('stock_quantity') + issue.quantity
                product.size_stock = size_stock
                product.save(update_fields=['size_stock', 'stock_quantity', 'updated_at'])
            issue.status = new_status
            if new_status == OrderIssueRequest.STATUS_COMPLETED:
                issue.completed_at = timezone.now()
            issue.seller_note = str(request.data.get('seller_note', '')).strip()
            if provider_ref:
                issue.provider_refund_id = provider_ref
            issue.save(update_fields=['status', 'seller_note', 'provider_refund_id', 'completed_at', 'updated_at'])
        return Response(OrderIssueRequestSerializer(issue, context={'request': request}).data)


class SellerExchangeCompletionOTPView(SellerWhatsAppOrdersView):
    def post(self, request, store_id, issue_id):
        store = self.get_store(request, store_id)
        issue = get_object_or_404(OrderIssueRequest, id=issue_id, order__store=store, request_type=OrderIssueRequest.TYPE_EXCHANGE)
        if issue.status != OrderIssueRequest.STATUS_PROCESSING:
            return Response({'detail': 'Exchange must be processing before completion OTP.'}, status=400)
        now = timezone.now()
        existing = OrderIssueCompletionOTP.objects.filter(issue=issue).first()
        if existing and existing.last_sent_at > now - timedelta(seconds=60):
            return Response({'detail': 'Please wait 60 seconds before resending.'}, status=429)
        if existing and existing.send_count >= 5 and existing.created_at > now - timedelta(hours=24):
            return Response({'detail': 'Maximum OTP sends reached for this exchange today.'}, status=429)
        code = f'{secrets.randbelow(900000) + 100000}'
        if not send_msg91_otp(issue.customer_phone, code):
            return Response({'detail': 'Exchange OTP could not be sent.'}, status=503)
        OrderIssueCompletionOTP.objects.update_or_create(issue=issue, defaults={
            'otp_hash': make_password(code), 'expires_at': now + timedelta(minutes=10), 'attempts': 0,
            'send_count': (existing.send_count + 1) if existing else 1, 'is_verified': False,
            'verified_at': None, 'last_sent_at': now,
        })
        clean = normalize_phone(issue.customer_phone)
        return Response({'message': f'Exchange OTP sent to +91 ******{clean[-4:]}.'})

    def patch(self, request, store_id, issue_id):
        store = self.get_store(request, store_id)
        issue = get_object_or_404(OrderIssueRequest, id=issue_id, order__store=store, request_type=OrderIssueRequest.TYPE_EXCHANGE)
        code, proof = str(request.data.get('otp', '')).strip(), request.FILES.get('completion_proof')
        if len(code) != 6 or not code.isdigit() or not proof:
            return Response({'detail': '6-digit OTP and handover proof photo are required.'}, status=400)
        if proof.size > 5 * 1024 * 1024 or proof.content_type not in ('image/jpeg','image/png','image/webp'):
            return Response({'detail': 'Proof must be JPG, PNG or WebP and no larger than 5 MB.'}, status=400)
        try:
            Image.open(proof).verify(); proof.seek(0)
        except (UnidentifiedImageError, OSError, ValueError):
            return Response({'detail': 'Invalid proof image.'}, status=400)
        with transaction.atomic():
            otp = OrderIssueCompletionOTP.objects.select_for_update().filter(issue=issue).first()
            if not otp or otp.expires_at < timezone.now() or otp.is_verified:
                return Response({'detail': 'OTP is missing, expired or already used.'}, status=400)
            if otp.attempts >= 5:
                return Response({'detail': 'Too many incorrect attempts.'}, status=429)
            valid_sms_otp = check_password(code, otp.otp_hash)
            valid_fallback = hmac.compare_digest(code, exchange_fallback_code(issue, otp))
            if not (valid_sms_otp or valid_fallback):
                otp.attempts += 1; otp.save(update_fields=['attempts'])
                return Response({'detail': 'Incorrect exchange OTP.'}, status=400)
            otp.is_verified = True; otp.verified_at = timezone.now(); otp.save(update_fields=['is_verified','verified_at'])
            issue.completion_proof = proof; issue.save(update_fields=['completion_proof','updated_at'])
        return Response({'success': True, 'message': 'Exchange handover verified. You may now complete the exchange.'})


class SellerWhatsAppOrderCountView(SellerWhatsAppOrdersView):
    def get(self, request, store_id):
        store = self.get_store(request, store_id)
        return Response({'new_orders_count': store.whatsapp_orders.filter(status=WhatsAppOrder.STATUS_NEW).count()})


class SellerDeliveryOTPView(SellerWhatsAppOrdersView):
    """Send and verify an OTP on the order's immutable customer phone."""

    @staticmethod
    def masked_phone(phone):
        clean = normalize_phone(phone)
        return f'+91 ******{clean[-4:]}' if len(clean) == 10 else 'customer mobile'

    def post(self, request, store_id, order_id):
        store = self.get_store(request, store_id)
        order = get_object_or_404(WhatsAppOrder, id=order_id, store=store)
        if order.status not in (WhatsAppOrder.STATUS_READY_FOR_PICKUP, WhatsAppOrder.STATUS_OUT_FOR_DELIVERY):
            return Response({'detail': 'OTP can be sent only when an order is ready for pickup or out for delivery.'}, status=400)
        phone = normalize_phone(order.customer_phone)
        if len(phone) != 10:
            return Response({'detail': 'This order does not have a valid verified customer number.'}, status=400)
        now = timezone.now()
        existing = OrderDeliveryOTP.objects.filter(order=order).first()
        if existing and existing.is_verified:
            return Response({'detail': 'Delivery OTP is already verified.'}, status=400)
        if existing and existing.last_sent_at > now - timedelta(seconds=60):
            wait = 60 - int((now - existing.last_sent_at).total_seconds())
            return Response({'detail': f'Please wait {max(1, wait)} seconds before resending OTP.'}, status=429)
        if existing and existing.send_count >= 5 and existing.created_at > now - timedelta(hours=24):
            return Response({'detail': 'Maximum 5 delivery OTP sends reached for this order today.'}, status=429)

        code = f'{secrets.randbelow(900000) + 100000}'
        if not send_msg91_otp(phone, code):
            return Response({'detail': 'OTP could not be sent. Check MSG91 configuration and try again.'}, status=503)
        defaults = {
            'otp_hash': make_password(code), 'expires_at': now + timedelta(minutes=10),
            'attempts': 0, 'is_verified': False, 'verified_at': None, 'last_sent_at': now,
            'send_count': (existing.send_count + 1) if existing else 1,
        }
        OrderDeliveryOTP.objects.update_or_create(order=order, defaults=defaults)
        broadcast_order_event_sync(f'order_{order.reference}', {'type': 'delivery_otp_sent', 'order_reference': order.reference})
        return Response({
            'success': True,
            'message': f'Delivery OTP sent to {self.masked_phone(phone)}.',
            'masked_phone': self.masked_phone(phone),
            'expires_in_seconds': 600,
        })

    def patch(self, request, store_id, order_id):
        store = self.get_store(request, store_id)
        submitted = str(request.data.get('otp', '')).strip()
        if not submitted.isdigit() or len(submitted) != 6:
            return Response({'detail': 'Enter the 6-digit OTP received by the customer.'}, status=400)
        with transaction.atomic():
            order = get_object_or_404(WhatsAppOrder.objects.select_for_update(), id=order_id, store=store)
            if order.status not in (WhatsAppOrder.STATUS_READY_FOR_PICKUP, WhatsAppOrder.STATUS_OUT_FOR_DELIVERY):
                return Response({'detail': 'Order is not ready for delivery confirmation.'}, status=400)
            otp = OrderDeliveryOTP.objects.select_for_update().filter(order=order).first()
            if not otp or otp.is_verified or otp.expires_at < timezone.now():
                return Response({'detail': 'Delivery OTP is missing or expired. Send a new OTP.'}, status=400)
            if otp.attempts >= 5:
                return Response({'detail': 'Too many incorrect attempts. Send a new OTP after the cooldown.'}, status=429)
            valid_sms_otp = check_password(submitted, otp.otp_hash)
            valid_fallback = hmac.compare_digest(submitted, delivery_fallback_code(order, otp))
            if not (valid_sms_otp or valid_fallback):
                otp.attempts += 1
                otp.save(update_fields=['attempts'])
                return Response({'detail': f'Incorrect OTP. {max(0, 5 - otp.attempts)} attempts remaining.'}, status=400)
            proof = request.FILES.get('delivery_proof')
            if order.order_type == 'HOME_DELIVERY' and not proof:
                return Response({'detail': 'Delivery proof photo is required for home delivery.'}, status=400)
            if proof:
                if proof.size > 5 * 1024 * 1024 or proof.content_type not in ('image/jpeg', 'image/png', 'image/webp'):
                    return Response({'detail': 'Delivery proof must be JPG, PNG or WebP and no larger than 5 MB.'}, status=400)
                try:
                    Image.open(proof).verify()
                    proof.seek(0)
                except (UnidentifiedImageError, OSError, ValueError):
                    return Response({'detail': 'Delivery proof is not a valid image.'}, status=400)
            previous_status = order.status
            otp.is_verified = True
            otp.verified_at = timezone.now()
            otp.save(update_fields=['is_verified', 'verified_at'])
            order.status = WhatsAppOrder.STATUS_DELIVERED
            order.delivered_at = timezone.now()
            if proof:
                order.delivery_proof = proof
            order.save(update_fields=['status', 'delivered_at', 'delivery_proof', 'updated_at'])
            OrderStatusEvent.objects.create(
                order=order, from_status=previous_status, to_status=order.status,
                actor_type='SELLER', actor_id=str(request.user.id), note='Customer delivery OTP verified.',
            )
        order_data = WhatsAppOrderSerializer(order).data
        broadcast_order_event_sync(f'order_{order.reference}', {'type': 'order_status_updated', 'order': order_data})
        broadcast_order_event_sync(f'store_{store.id}', {'type': 'order_status_updated', 'order': order_data})
        return Response({'success': True, 'message': 'OTP verified. Order marked delivered.', 'order': order_data})


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


class SellerResendWhatsAppInvoiceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, store_id, order_id):
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        order = get_object_or_404(WhatsAppOrder, id=order_id, store=store)
        from .whatsapp_alerts import send_automated_order_whatsapp_alerts
        result = send_automated_order_whatsapp_alerts(order)
        return Response({
            'success': True,
            'alerts': result,
            'message': f"WhatsApp invoice alert triggered for #{order.reference}."
        })
