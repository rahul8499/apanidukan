from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from products.models import Coupon
from categories.defaults import ensure_garment_default_categories
from categories.models import Category
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

    def test_active_scratch_reward_is_listed_as_store_wide_coupon(self):
        response = self.client.get('/api/v1/public/stores/secure-store/coupons/')
        self.assertEqual(response.status_code, 200)
        scratch = next(item for item in response.data if item['code'] == 'SAFE5')
        self.assertTrue(scratch['is_scratch'])
        self.assertIsNone(scratch['product_id'])
        self.assertEqual(scratch['discount_type'], 'FLAT')
        self.assertEqual(scratch['discount_value'], 5.0)


class DefaultGarmentCategoryTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            email='garment-owner@example.com', password='Strong-test-password-123!'
        )

    def test_new_garment_store_gets_default_categories_automatically(self):
        store = Store.objects.create(owner=self.owner, name='Garment Store', slug='default-garment-store')

        categories = Category.objects.filter(store=store)

        self.assertEqual(categories.count(), 9)
        self.assertTrue(categories.filter(name='Men - Shirts, T-Shirts & Topwear').exists())
        self.assertTrue(categories.filter(name='Winter & Seasonal Wear').exists())

    def test_running_default_category_setup_again_does_not_duplicate_categories(self):
        store = Store.objects.create(owner=self.owner, name='Repeat Store', slug='repeat-garment-store')

        created = ensure_garment_default_categories(store)

        self.assertEqual(created, [])
        self.assertEqual(Category.objects.filter(store=store).count(), 9)
