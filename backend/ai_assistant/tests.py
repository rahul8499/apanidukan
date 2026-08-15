from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory

from .views import AssistantChatView


class AssistantChatViewTests(TestCase):
    @patch('ai_assistant.views.chat', return_value='{"answer": "Sabse sasta product Demo Item hai, ₹99.00 mein."}')
    def test_price_question_is_sent_to_ollama(self, mocked_chat):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'sabse kam price vala product konsa hai'},
            format='json',
        )

        response = AssistantChatView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['answer'], 'Sabse sasta product Demo Item hai, ₹99.00 mein.')
        mocked_chat.assert_called_once()
        user_message = mocked_chat.call_args.kwargs['messages'][1]['content']
        self.assertEqual(user_message, 'sabse kam price vala product konsa hai')

    @patch('ai_assistant.views.chat', return_value='{"answer": "Baby Shampoo ₹150 ka hai."}')
    def test_follow_up_question_includes_recent_chat_history(self, mocked_chat):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {
                'message': 'un products ki price kya hai?',
                'history': '[{"role":"user","text":"Kya new product add hua hai?"},{"role":"assistant","text":"Baby Shampoo aur Baby Diapers recently add hue hain."}]',
            },
            format='json',
        )

        response = AssistantChatView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        messages = mocked_chat.call_args.kwargs['messages']
        self.assertEqual(messages[1]['content'], 'Kya new product add hua hai?')
        self.assertEqual(messages[2]['content'], 'Baby Shampoo aur Baby Diapers recently add hue hain.')

    @patch('ai_assistant.views.chat', return_value='Sabse mehnga product Demo Premium Item hai, ₹999.00 mein.')
    def test_invalid_json_fallback_uses_raw_content(self, mocked_chat):
        request = APIRequestFactory().post(
            '/api/v1/ai/assistant/',
            {'message': 'sabse mehnga product konsa hai'},
            format='json',
        )

        response = AssistantChatView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['answer'], 'Sabse mehnga product Demo Premium Item hai, ₹999.00 mein.')
