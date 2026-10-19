from django.contrib.auth import get_user_model
from datetime import timedelta
from unittest.mock import patch
from django.utils import timezone
from asgiref.sync import async_to_sync
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from config.websocket import _can_access_delivery_agent_topic
from stores.models import DeliveryAgent, Store
from .models import DeliveryAssignment, OrderCancellationOTP, WhatsAppOrder


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

    @patch('orders.delivery_views.broadcast_delivery_agent_event_sync')
    def test_reassignment_notifies_old_and_new_delivery_agents(self, broadcast_agent):
        first = self.create_agent()
        second = self.client.post(f'/api/v1/seller/stores/{self.store.id}/delivery-agents/', {
            'full_name': 'Neha Rider', 'email': 'neha.rider@example.com', 'phone_number': '9876543211',
            'vehicle_type': 'Bike', 'vehicle_number': 'MH12CD5678',
        }, format='json')
        self.assertEqual(second.status_code, 201)
        order = WhatsAppOrder.objects.create(
            store=self.store, customer_name='Customer', customer_phone='9999999999',
            order_type='HOME_DELIVERY', delivery_address='Pune', total='499.00', items=[], status=WhatsAppOrder.STATUS_NEW,
        )
        assignment_url = f'/api/v1/seller/stores/{self.store.id}/whatsapp-orders/{order.id}/assign-agent/'
        first_assignment = self.client.post(assignment_url, {'agent_id': first['id']}, format='json')
        self.assertEqual(first_assignment.status_code, 200, first_assignment.data)
        broadcast_agent.reset_mock()

        reassigned = self.client.post(assignment_url, {'agent_id': second.data['id']}, format='json')

        self.assertEqual(reassigned.status_code, 200, reassigned.data)
        self.assertEqual(broadcast_agent.call_count, 2)
        self.assertEqual(broadcast_agent.call_args_list[0].args[0], first['id'])
        self.assertEqual(broadcast_agent.call_args_list[0].args[1]['type'], 'delivery_assignment_removed')
        self.assertEqual(broadcast_agent.call_args_list[0].args[1]['order_id'], order.id)
        self.assertEqual(broadcast_agent.call_args_list[1].args[0], second.data['id'])
        self.assertEqual(broadcast_agent.call_args_list[1].args[1]['type'], 'delivery_assignment_updated')
        self.assertEqual(broadcast_agent.call_args_list[1].args[1]['assignment']['order']['id'], order.id)

    def test_other_store_owner_cannot_read_team(self):
        self.create_agent()
        self.client.force_authenticate(self.other)
        response = self.client.get(f'/api/v1/seller/stores/{self.store.id}/delivery-agents/')
        self.assertEqual(response.status_code, 404)

    def test_private_delivery_websocket_requires_the_agents_own_jwt(self):
        self.create_agent()
        agent = DeliveryAgent.objects.get(phone_number='9876543210')
        agent_token = str(AccessToken.for_user(agent.user))
        seller_token = str(AccessToken.for_user(self.owner))

        self.assertTrue(async_to_sync(_can_access_delivery_agent_topic)(agent_token, str(agent.id)))
        self.assertFalse(async_to_sync(_can_access_delivery_agent_topic)(seller_token, str(agent.id)))

    @patch('orders.delivery_views.send_msg91_otp', return_value=True)
    @patch('orders.delivery_views.secrets.randbelow', return_value=234567)
    def test_delivery_cancellation_requires_customer_otp(self, mocked_random, mocked_send):
        self.create_agent()
        agent = DeliveryAgent.objects.get(phone_number='9876543210')
        order = WhatsAppOrder.objects.create(
            store=self.store, customer_name='Customer', customer_phone='9999999999',
            customer_phone_verified=True, order_type='HOME_DELIVERY', delivery_address='Pune',
            total='499.00', items=[], status=WhatsAppOrder.STATUS_OUT_FOR_DELIVERY,
        )
        assignment = DeliveryAssignment.objects.create(
            order=order, agent=agent, assigned_by=self.owner,
            status=DeliveryAssignment.STATUS_OUT_FOR_DELIVERY,
        )
        self.client.force_authenticate(agent.user)
        url = f'/api/v1/delivery/orders/{order.id}/cancellation-otp/'

        sent = self.client.post(url, {}, format='json')
        self.assertEqual(sent.status_code, 200, sent.data)
        self.assertEqual(sent.data['message'], 'Cancellation OTP sent to ******9999.')
        self.assertIn('expires_at', sent.data)
        mocked_send.assert_called_once_with('9999999999', '334567')

        reopened = self.client.post(url, {}, format='json')
        self.assertEqual(reopened.status_code, 200, reopened.data)
        self.assertTrue(reopened.data['reused_existing'])
        mocked_send.assert_called_once()

        wrong = self.client.patch(url, {'otp': '000000', 'reason': 'Customer changed mind'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        order.refresh_from_db()
        assignment.refresh_from_db()
        self.assertEqual(order.status, WhatsAppOrder.STATUS_OUT_FOR_DELIVERY)
        self.assertEqual(assignment.status, DeliveryAssignment.STATUS_OUT_FOR_DELIVERY)
        self.assertEqual(OrderCancellationOTP.objects.get(order=order).attempts, 1)

        verified = self.client.patch(url, {'otp': '334567', 'reason': 'Customer requested cancel'}, format='json')
        self.assertEqual(verified.status_code, 200, verified.data)
        order.refresh_from_db()
        assignment.refresh_from_db()
        self.assertEqual(order.status, WhatsAppOrder.STATUS_CANCELLED)
        self.assertEqual(order.cancelled_by, 'DELIVERY_AGENT')
        self.assertEqual(order.cancellation_reason, 'Customer requested cancel')
        self.assertEqual(assignment.status, DeliveryAssignment.STATUS_CANCELLED)

    @patch('orders.delivery_views.send_msg91_otp', return_value=True)
    @patch('orders.delivery_views.secrets.randbelow', return_value=234567)
    def test_expired_cancellation_otp_can_be_resent_after_attempt_lockout(self, mocked_random, mocked_send):
        self.create_agent()
        agent = DeliveryAgent.objects.get(phone_number='9876543210')
        order = WhatsAppOrder.objects.create(
            store=self.store, customer_name='Customer', customer_phone='9999999999',
            customer_phone_verified=False, order_type='HOME_DELIVERY', delivery_address='Pune',
            total='499.00', items=[], status=WhatsAppOrder.STATUS_OUT_FOR_DELIVERY,
        )
        DeliveryAssignment.objects.create(
            order=order, agent=agent, assigned_by=self.owner,
            status=DeliveryAssignment.STATUS_OUT_FOR_DELIVERY,
        )
        expired_at = timezone.now() - timedelta(minutes=1)
        OrderCancellationOTP.objects.create(
            order=order, otp_hash='expired-hash', expires_at=expired_at,
            attempts=5, send_count=1, last_sent_at=expired_at,
        )
        self.client.force_authenticate(agent.user)

        response = self.client.post(f'/api/v1/delivery/orders/{order.id}/cancellation-otp/', {'resend': True}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(OrderCancellationOTP.objects.get(order=order).attempts, 0)
        mocked_send.assert_called_once_with('9999999999', '334567')

    @patch('orders.delivery_views.send_msg91_otp', return_value=True)
    @patch('orders.delivery_views.secrets.randbelow', return_value=234567)
    def test_cancellation_otp_uses_saved_customer_phone_even_if_checkout_flag_is_false(self, mocked_random, mocked_send):
        self.create_agent()
        agent = DeliveryAgent.objects.get(phone_number='9876543210')
        order = WhatsAppOrder.objects.create(
            store=self.store, customer_name='Customer', customer_phone='9999999999',
            customer_phone_verified=False, order_type='HOME_DELIVERY', delivery_address='Pune',
            total='499.00', items=[], status=WhatsAppOrder.STATUS_OUT_FOR_DELIVERY,
        )
        DeliveryAssignment.objects.create(
            order=order, agent=agent, assigned_by=self.owner,
            status=DeliveryAssignment.STATUS_OUT_FOR_DELIVERY,
        )
        self.client.force_authenticate(agent.user)

        url = f'/api/v1/delivery/orders/{order.id}/cancellation-otp/'
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        mocked_send.assert_called_once_with('9999999999', '334567')
        verified = self.client.patch(url, {'otp': '334567', 'reason': 'Customer confirmed cancel'}, format='json')
        self.assertEqual(verified.status_code, 200, verified.data)
        order.refresh_from_db()
        self.assertEqual(order.status, WhatsAppOrder.STATUS_CANCELLED)
