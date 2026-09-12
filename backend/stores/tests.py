from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from products.models import Coupon
from stores.models import Store, StoreScratchConfig


class ScratchCouponSecurityTests(APITestCase):
    def setUp(self):
        owner = get_user_model().objects.create_user(
            email='owner@example.com', password='Strong-test-password-123!'
        )
        self.store = Store.objects.create(
            owner=owner, name='Secure Store', slug='secure-store', is_published=True
        )
        StoreScratchConfig.objects.create(
            store=self.store,
            enabled=True,
            coupon_code='SAFE5',
            discount_type='fixed',
            discount_value=Decimal('5.00'),
            min_order=Decimal('10.00'),
        )

    def test_anonymous_client_cannot_choose_scratch_discount(self):
        response = self.client.post(
            '/api/v1/public/stores/secure-store/validate-coupon/',
            {
                'code': 'SAFE5',
                'subtotal': 100,
                'items': [],
                'is_scratch': True,
                'scratch_discount_value': 999,
                'scratch_discount_type': 'PERCENTAGE',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['discount_amount'], 5.0)
        self.assertFalse(Coupon.objects.filter(store=self.store, code='SAFE5').exists())

    def test_unknown_client_defined_scratch_coupon_is_rejected(self):
        response = self.client.post(
            '/api/v1/public/stores/secure-store/validate-coupon/',
            {
                'code': 'ATTACKER100',
                'subtotal': 100,
                'items': [],
                'is_scratch': True,
                'scratch_discount_value': 100,
                'scratch_discount_type': 'PERCENTAGE',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Coupon.objects.filter(store=self.store, code='ATTACKER100').exists())

