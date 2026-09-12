from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from unittest.mock import patch


class AccountDeletionSecurityTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='seller@example.com', password='Strong-test-password-123!'
        )

    def test_public_identifier_alone_cannot_delete_account(self):
        response = self.client.post(
            '/api/v1/auth/account/delete-request/',
            {'identifier': self.user.email},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    @patch('accounts.views.verify_msg91_widget_token')
    def test_verified_phone_owner_can_delete_account(self, verify_token):
        self.user.phone_number = '9876543210'
        self.user.save(update_fields=['phone_number'])
        verify_token.return_value = {'success': True, 'data': {'mobile': '919876543210'}}

        response = self.client.post(
            '/api/v1/auth/account/delete-request/',
            {
                'phone_number': '9876543210',
                'access_token': 'verified-msg91-token',
                'confirmation': 'DELETE',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_authenticated_user_can_only_deactivate_own_account(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            '/api/v1/auth/account/deactivate/', {'confirmation': 'DELETE'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_deactivation_requires_explicit_confirmation(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/v1/auth/account/deactivate/', {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
