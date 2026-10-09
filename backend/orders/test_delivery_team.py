from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from stores.models import Store
from .models import WhatsAppOrder


class DeliveryTeamFlowTests(APITestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(email='delivery-owner@example.com', password='Owner-pass-123!')
        self.other = get_user_model().objects.create_user(email='other-owner@example.com', password='Owner-pass-123!')
        self.store = Store.objects.create(owner=self.owner, name='Garment Store', slug='garment-store', is_published=True)
        self.client.force_authenticate(self.owner)

    def create_agent(self):
        response = self.client.post(f'/api/v1/seller/stores/{self.store.id}/delivery-agents/', {
            'full_name': 'Ravi Rider', 'email': 'ravi.rider@example.com', 'phone_number': '9876543210', 'vehicle_type': 'Bike', 'vehicle_number': 'MH12AB1234'
        }, format='json')
        self.assertEqual(response.status_code, 201)
        return response.data

    def test_credentials_login_and_agent_order_isolation(self):
        credentials = self.create_agent()
        self.client.force_authenticate(None)
        login = self.client.post('/api/v1/auth/login/', {
            'email': credentials['email'], 'password': credentials['temporary_password']
        }, format='json')
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        me = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me.data['data']['role'], 'DELIVERY_AGENT')
        orders = self.client.get('/api/v1/delivery/orders/')
        self.assertEqual(orders.status_code, 200)
        self.assertEqual(orders.data, [])

    def test_seller_can_preassign_new_home_delivery(self):
        agent = self.create_agent()
        order = WhatsAppOrder.objects.create(store=self.store, customer_name='Customer', customer_phone='9999999999',
            order_type='HOME_DELIVERY', delivery_address='Pune', total='499.00', items=[], status=WhatsAppOrder.STATUS_NEW)
        assigned = self.client.post(f'/api/v1/seller/stores/{self.store.id}/whatsapp-orders/{order.id}/assign-agent/', {'agent_id': agent['id']})
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.data['assignment']['status'], 'ASSIGNED')

    def test_other_store_owner_cannot_read_team(self):
        self.create_agent()
        self.client.force_authenticate(self.other)
        response = self.client.get(f'/api/v1/seller/stores/{self.store.id}/delivery-agents/')
        self.assertEqual(response.status_code, 404)
