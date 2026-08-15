from django.urls import path
from .views import AssistantChatView

urlpatterns = [
    path('ai/assistant/', AssistantChatView.as_view(), name='ai-assistant'),
]
