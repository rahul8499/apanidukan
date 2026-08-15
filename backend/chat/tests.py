from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from stores.models import Store
from .models import ChatConversation


class SellerConversationFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='seller@example.com', password='pass1234')
        self.store = Store.objects.create(owner=self.user, name='Test Store', slug='test-store', is_published=True)

        token_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': 'seller@example.com', 'password': 'pass1234'},
            content_type='application/json',
        )
        self.access_token = token_response.json()['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.access_token}'

    def test_seller_list_includes_new_zero_message_conversation(self):
        older = ChatConversation.objects.create(
            store=self.store,
            session_id='seller_init_old',
            customer_name='Old Customer',
            customer_phone='+15550000001',
            last_message_at=timezone.now() - timezone.timedelta(days=2),
        )
        newer = ChatConversation.objects.create(
            store=self.store,
            session_id='seller_init_new',
            customer_name='New Customer',
            customer_phone='+15550000002',
            last_message_at=timezone.now(),
        )

        response = self.client.get(reverse('seller-list-conversations', args=[self.store.id]))

        self.assertEqual(response.status_code, 200)
        ids = [item['id'] for item in response.json()]
        self.assertIn(older.id, ids)
        self.assertIn(newer.id, ids)
        self.assertLess(ids.index(newer.id), ids.index(older.id))

    def test_public_whatsapp_order_requires_phone_number(self):
        response = self.client.post(
            reverse('public-whatsapp-order', args=[self.store.slug]),
            {
                'items': [{'id': 999, 'quantity': 1}],
                'customer_name': 'Alice',
                'customer_phone': '',
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('customer_phone', response.json())
