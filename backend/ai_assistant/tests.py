from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from products.models import Product
from stores.models import Store
from .ollama import _strip_reasoning
from .views import AssistantChatView

User = get_user_model()


class StripReasoningTests(TestCase):
    def test_removes_reasoning_lines(self):
        raw = (
            "The user is asking for the most recent/latest added product.\n\n"
            "Looking at the Latest additions, sorted newest to oldest section:\n"
            "The first item listed (newest) is 'Baby Shampoo' with an addition date of 2026-08-15 12:13 UTC.\n\n"
            "Baby Shampoo is the latest product."
        )
        self.assertEqual(
            _strip_reasoning(raw),
            "Baby Shampoo is the latest product.",
        )

    def test_passthrough_clean_answer(self):
        self.assertEqual(
            _strip_reasoning("Baby Shampoo ₹150 ka hai."),
            "Baby Shampoo ₹150 ka hai.",
        )

    def test_empty_input(self):
        self.assertEqual(_strip_reasoning(""), "")
        self.assertIsNone(_strip_reasoning(None))

    def test_removes_environment_details(self):
        raw = (
            "{\n"
            '"answer": "The user is asking...\n\n'
            "- Baby Shampoo - Added: 2026-08-15 12:13 UTC (newest)\n"
            "- watch (latest <environment_details>\n"
            "Current time: 2026-08-15T19:04:12+05:30\n"
            "Working directory: /home/rahulkolhe/Desktop/practice\n"
            "</environment_details>"
        )
        self.assertEqual(
            _strip_reasoning(raw),
            '{\n- Baby Shampoo - Added: 2026-08-15 12:13 UTC (newest)\n- watch (latest',
        )

    def test_removes_json_answer_reasoning_prefix(self):
        raw = (
            "The user is asking for the most expensive (mehnga) product. I need to check the published catalog...\n"
            "Looking at the Published catalog section:\n"
            "Bluetooth Wireless Earbuds (₹1299.00) sabse mehnga product hai."
        )
        self.assertEqual(
            _strip_reasoning(raw),
            "Bluetooth Wireless Earbuds (₹1299.00) sabse mehnga product hai.",
        )


class AssistantChatViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='testowner@example.com', password='password123')
        self.store = Store.objects.create(owner=self.user, name='Test Store', slug='test-store')
        Product.objects.create(store=self.store, name='Waterproof Bike Cover', slug='waterproof-bike-cover', price=499.00, stock_quantity=10, is_published=True)
        Product.objects.create(store=self.store, name='Full Face Riding Helmet', slug='full-face-riding-helmet', price=1850.00, stock_quantity=5, is_published=True)
        Product.objects.create(store=self.store, name='Baby Powder', slug='baby-powder', price=120.00, stock_quantity=20, is_published=True)

    def test_fast_path_most_expensive_product(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'sabse mehnga product konsa hai'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Full Face Riding Helmet', response.data['answer'])
        self.assertIn('1,850.00', response.data['answer'])

    def test_fast_path_scoped_cheapest_product(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'baby product mai se sabse kam price vala product konsa hai?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Baby Powder', response.data['answer'])
        self.assertIn('120.00', response.data['answer'])

    def test_fast_path_latest_product_with_fillers(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'abse latest product konsa add hua hai'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Sabse naya product', response.data['answer'])

    def test_fast_path_popular_products(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'Popular products dikhao'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('popular products:', response.data['answer'])

    def test_fast_path_available_products(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'Sirf available products dikhao'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('available (In-stock) products:', response.data['answer'])

    def test_fast_path_latest_scoped_product(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'Latest baby product konsa hai?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Baby Powder', response.data['answer'])

    def test_fast_path_product_price_direct(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'bike cover price?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Waterproof Bike Cover', response.data['answer'])
        self.assertIn('499.00', response.data['answer'])

    def test_general_store_location_query_bypasses_fast_path(self):
        # Create a product with 'Store' in the title to ensure it is NOT mistakenly returned as a product
        Product.objects.create(store=self.store, name='WhatsApp Store Setup Guide', slug='whatsapp-store-setup', price=299.00, stock_quantity=10, is_published=True)
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'Store kaha hai?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('WhatsApp Store Setup Guide', response.data['answer'])
        self.assertIn('multi-vendor marketplace platform', response.data['answer'].lower())

    def test_fast_path_platform_faq_delivery(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'Home delivery available hai?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('home delivery available hai', response.data['answer'].lower())

    def test_fast_path_platform_faq_store_address(self):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'Store ka address kya hai?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('multi-vendor marketplace platform', response.data['answer'].lower())

    def test_fast_path_budget_price_filter(self):
        # 1. Query for baby product under 100 when Baby Powder is 120
        request1 = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'mujhe 100 ke andar baby product chahiye'},
            format='json',
        )
        response1 = AssistantChatView.as_view()(request1)
        self.assertEqual(response1.status_code, 200)
        self.assertIn("budget (₹100.00 ke andar) me koi 'baby' product available nahi hai", response1.data['answer'])
        self.assertIn('Baby Powder', response1.data['answer'])

        # 2. Query for products under 500
        request2 = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': '500 ke andar products dikhao'},
            format='json',
        )
        response2 = AssistantChatView.as_view()(request2)
        self.assertEqual(response2.status_code, 200)
        self.assertIn('500.00 ke andar available products:', response2.data['answer'])

    @patch('ai_assistant.views.chat', return_value='{"intent": "product_price", "search_term": "bike cover"}')
    def test_intent_parsing_natural_language_query(self, mocked_chat):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'bhai woh bike wala jo baarish me kharab nahi hota uska rate bata'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Waterproof Bike Cover', response.data['answer'])

    @patch('ai_assistant.views.chat', return_value='{"answer": "Aap store se multi-vendor products buy kar sakte ho."}')
    def test_general_chat_fallback(self, mocked_chat):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'How does delivery work?'},
            format='json',
        )
        response = AssistantChatView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['answer'], 'Aap store se multi-vendor products buy kar sakte ho.')
