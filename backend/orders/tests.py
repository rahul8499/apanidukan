from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from unittest.mock import patch
from django.contrib.auth.hashers import make_password
from django.core.files.uploadedfile import SimpleUploadedFile
import base64

from categories.models import Category
from products.models import Product, ProductVariant
from stores.models import Store
from .models import CheckoutPhoneVerification, WhatsAppOrder, OrderDeliveryOTP, OrderIssueRequest, OrderIssueCompletionOTP


class ProductionCheckoutFlowTests(APITestCase):
    def setUp(self):
        owner = get_user_model().objects.create_user(email='seller-orders@example.com', password='test-password')
        self.owner = owner
        self.store = Store.objects.create(
            owner=owner,
            name='Garment Store',
            slug='garment-store',
            business_type='GARMENTS',
            is_published=True,
            delivery_charge_type='FIXED',
            delivery_flat_fee=Decimal('30.00'),
            exchange_enabled=True,
            exchange_window_days=7,
            exchange_evidence_required=False,
            exchange_allowed_reasons=['Size does not fit'],
        )
        category = Category.objects.create(store=self.store, name='Shirts', slug='shirts')
        self.product = Product.objects.create(
            store=self.store,
            category=category,
            name='Cotton Shirt',
            slug='cotton-shirt',
            price=Decimal('500.00'),
            currency='INR',
            available_sizes=['M', 'L'],
            size_stock={'M': 2, 'L': 3},
            stock_quantity=5,
            is_published=True,
        )
        ProductVariant.objects.create(product=self.product, size='M', sku='SHIRT-M', stock_quantity=2)
        ProductVariant.objects.create(product=self.product, size='L', sku='SHIRT-L', stock_quantity=3)

    def verification(self):
        return CheckoutPhoneVerification.objects.create(
            store=self.store,
            customer_phone='9876543210',
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    def payload(self, **overrides):
        data = {
            'items': [{'id': self.product.id, 'quantity': 1, 'selected_size': 'M'}],
            'customer_name': 'Test Customer',
            'customer_phone': '9876543210',
            'checkout_verification_token': str(self.verification().token),
            'order_type': 'HOME_DELIVERY',
            'payment_type': 'COD',
            'delivery_address': 'House 10, Main Road, Pune, Maharashtra 411001',
            'idempotency_key': f'test-{timezone.now().timestamp()}',
        }
        data.update(overrides)
        return data

    def test_size_stock_is_deducted_atomically(self):
        response = self.client.post(reverse('public-whatsapp-order', args=[self.store.slug]), self.payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.product.refresh_from_db()
        variant = ProductVariant.objects.get(product=self.product, size='M')
        self.assertEqual(self.product.size_stock['M'], 1)
        self.assertEqual(self.product.stock_quantity, 4)
        self.assertEqual(variant.stock_quantity, 1)
        self.assertEqual(response.data['items'][0]['selected_size'], 'M')

    def test_unavailable_size_is_rejected_without_stock_change(self):
        response = self.client.post(
            reverse('public-whatsapp-order', args=[self.store.slug]),
            self.payload(items=[{'id': self.product.id, 'quantity': 3, 'selected_size': 'M'}]),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 5)

    def test_home_delivery_requires_complete_address(self):
        response = self.client.post(
            reverse('public-whatsapp-order', args=[self.store.slug]),
            self.payload(delivery_address='Pune'),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('delivery_address', response.data)

    def test_unverified_online_payment_is_rejected(self):
        response = self.client.post(
            reverse('public-whatsapp-order', args=[self.store.slug]),
            self.payload(payment_type='ONLINE'),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('payment_type', response.data)

    def test_quick_reorder_rebuilds_cart_with_size_and_requires_checkout(self):
        placed = self.client.post(reverse('public-whatsapp-order', args=[self.store.slug]), self.payload(), format='json')
        response = self.client.post(
            reverse('public-quick-reorder', args=[self.store.slug, placed.data['reference']]),
            {'tracking_token': placed.data['tracking_token']},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['requires_checkout_verification'])
        self.assertEqual(response.data['cart_items'][0]['selectedSize'], 'M')
        self.assertEqual(WhatsAppOrder.objects.count(), 1)

    def test_cancellation_restores_size_and_total_stock(self):
        placed = self.client.post(reverse('public-whatsapp-order', args=[self.store.slug]), self.payload(), format='json')
        response = self.client.post(
            reverse('public-customer-cancel-order', args=[self.store.slug, placed.data['reference']]),
            {'tracking_token': placed.data['tracking_token'], 'cancellation_reason': 'Changed mind'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        variant = ProductVariant.objects.get(product=self.product, size='M')
        self.assertEqual(self.product.size_stock['M'], 2)
        self.assertEqual(self.product.stock_quantity, 5)
        self.assertEqual(variant.stock_quantity, 2)

    def test_exchange_request_moves_variant_stock_only_when_completed(self):
        placed = self.client.post(reverse('public-whatsapp-order', args=[self.store.slug]), self.payload(), format='json')
        order = WhatsAppOrder.objects.get(reference=placed.data['reference'])
        order.status = WhatsAppOrder.STATUS_DELIVERED
        order.save(update_fields=['status', 'updated_at'])
        requested = self.client.post(
            reverse('public-order-issues', args=[self.store.slug, order.reference]),
            {
                'tracking_token': str(order.tracking_token), 'request_type': 'EXCHANGE',
                'product_id': self.product.id, 'selected_size': 'M', 'requested_size': 'L',
                'quantity': 1, 'reason': 'Size does not fit',
            }, format='json',
        )
        self.assertEqual(requested.status_code, 201, requested.data)
        self.client.force_authenticate(self.owner)
        issue_url = reverse('seller-order-issue-update', args=[self.store.id, requested.data['id']])
        for next_status in ('APPROVED', 'PROCESSING'):
            response = self.client.patch(issue_url, {'status': next_status}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        issue = OrderIssueRequest.objects.get(id=requested.data['id'])
        OrderIssueCompletionOTP.objects.create(issue=issue, otp_hash=make_password('234567'), expires_at=timezone.now() + timedelta(minutes=10), is_verified=True)
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
        issue.completion_proof = SimpleUploadedFile('proof.png', png, content_type='image/png')
        issue.save(update_fields=['completion_proof'])
        response = self.client.patch(issue_url, {'status': 'COMPLETED'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.size_stock, {'M': 2, 'L': 2})
        self.assertEqual(self.product.stock_quantity, 4)
        self.assertEqual(ProductVariant.objects.get(product=self.product, size='M').stock_quantity, 2)
        self.assertEqual(ProductVariant.objects.get(product=self.product, size='L').stock_quantity, 2)

    def test_exchange_policy_toggle_and_evidence_are_enforced_by_backend(self):
        placed = self.client.post(reverse('public-whatsapp-order', args=[self.store.slug]), self.payload(), format='json')
        order = WhatsAppOrder.objects.get(reference=placed.data['reference'])
        order.status = WhatsAppOrder.STATUS_DELIVERED
        order.save(update_fields=['status', 'updated_at'])
        payload = {
            'tracking_token': str(order.tracking_token), 'request_type': 'EXCHANGE',
            'product_id': self.product.id, 'selected_size': 'M', 'requested_size': 'L',
            'quantity': 1, 'reason': 'Size does not fit',
        }
        url = reverse('public-order-issues', args=[self.store.slug, order.reference])
        self.store.exchange_enabled = False
        self.store.save(update_fields=['exchange_enabled'])
        self.assertEqual(self.client.post(url, payload, format='json').status_code, 400)
        self.store.exchange_enabled = True
        self.store.exchange_evidence_required = True
        self.store.save(update_fields=['exchange_enabled', 'exchange_evidence_required'])
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Photo evidence', response.data['detail'])

    @patch('orders.views.secrets.randbelow', return_value=134567)
    @patch('orders.views.send_msg91_otp', return_value=True)
    def test_delivery_requires_customer_otp(self, mocked_send, mocked_random):
        placed = self.client.post(reverse('public-whatsapp-order', args=[self.store.slug]), self.payload(), format='json')
        order = WhatsAppOrder.objects.get(reference=placed.data['reference'])
        order.status = WhatsAppOrder.STATUS_READY_FOR_PICKUP
        order.order_type = 'STORE_PICKUP'
        order.save(update_fields=['status', 'order_type', 'updated_at'])
        self.client.force_authenticate(self.owner)
        url = reverse('seller-delivery-otp', args=[self.store.id, order.id])
        sent = self.client.post(url, {}, format='json')
        self.assertEqual(sent.status_code, 200, sent.data)
        self.assertNotIn('9876543210', str(sent.data))
        mocked_send.assert_called_once_with('9876543210', '234567')
        self.client.force_authenticate(user=None)
        tracking = self.client.get(
            reverse('public-whatsapp-order-detail', args=[self.store.slug, order.reference]),
            {'tracking_token': str(order.tracking_token)},
        )
        self.assertEqual(tracking.status_code, 200)
        fallback_code = tracking.data['delivery_fallback_code']
        self.assertEqual(len(fallback_code), 6)
        self.client.force_authenticate(self.owner)
        wrong = self.client.patch(url, {'otp': '000000'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, WhatsAppOrder.STATUS_READY_FOR_PICKUP)
        verified = self.client.patch(url, {'otp': fallback_code}, format='json')
        self.assertEqual(verified.status_code, 200, verified.data)
        order.refresh_from_db()
        self.assertEqual(order.status, WhatsAppOrder.STATUS_DELIVERED)
        self.assertTrue(OrderDeliveryOTP.objects.get(order=order).is_verified)
