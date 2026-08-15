from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from orders.models import Order, Payment, ProductAccess
from downloads.models import DownloadToken
from .payment_providers import DummyProvider
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from cart.models import Cart, CartItem
from notifications.whatsapp import send_whatsapp_message


class CreatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        order = get_object_or_404(Order, pk=order_id)
        if order.customer != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        provider = DummyProvider()
        res = provider.create_payment(order.id, str(order.total), order.currency)
        payment, _ = Payment.objects.get_or_create(order=order, defaults={'provider': 'dummy', 'amount': order.total, 'currency': order.currency})
        payment.transaction_id = res['transaction_id']
        payment.status = Payment.STATUS_CREATED
        payment.save()
        return Response({'success': True, 'payment_url': res['payment_url'], 'transaction_id': res['transaction_id']})


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        transaction_id = request.data.get('transaction_id')
        payment = get_object_or_404(Payment, transaction_id=transaction_id)
        if payment.order.customer != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        if payment.status == Payment.STATUS_SUCCESS:
            return Response({'success': True, 'message': 'Payment already verified.'})
        provider = DummyProvider()
        res = provider.verify_payment({'transaction_id': transaction_id})
        if res.get('status') == 'success':
            payment.status = Payment.STATUS_SUCCESS
            payment.paid_at = timezone.now()
            payment.save()
            order = payment.order
            order.status = Order.STATUS_PAID
            order.save()
            # grant access and create download tokens
            accesses = []
            for item in order.items.all():
                ProductAccess.objects.create(customer=order.customer, product=item.product, order=order)
                # create download token
                if item.product.digital_file:
                    dt = DownloadToken.objects.create(user=order.customer, product_id=item.product.id, file_path=item.product.digital_file.name)
                    accesses.append({'product_id': item.product.id, 'download_token': str(dt.token)})
            # clear the buyer's cart after successful payment
            try:
                cart = Cart.objects.filter(user=order.customer).first()
                if cart:
                    CartItem.objects.filter(cart=cart).delete()
            except Exception:
                pass
            # notify store owner via WhatsApp if phone available
            try:
                store = order.store
                phone = getattr(store, 'phone_number', None)
                if phone:
                    msg_lines = [f"New order for your store {store.name}:", f"Order: {order.order_number}", f"Buyer: {order.customer.email}", f"Total: {order.total} {order.currency}"]
                    for itm in order.items.all():
                        msg_lines.append(f"- {itm.product_name_snapshot} x{itm.quantity} ({itm.price_snapshot})")
                    msg = '\n'.join(msg_lines)
                    send_whatsapp_message(phone, msg)
            except Exception:
                pass
            return Response({'success': True, 'accesses': accesses})
        else:
            payment.status = Payment.STATUS_FAILED
            payment.save()
            return Response({'success': False, 'message': 'Payment failed'}, status=status.HTTP_400_BAD_REQUEST)
