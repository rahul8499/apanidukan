from django.urls import path
from .views import CreatePaymentView, VerifyPaymentView
from .subscription_views import (
    CreateStoreSubscriptionView,
    VerifyStoreSubscriptionView,
    GetStoreSubscriptionStatusView,
    CancelStoreSubscriptionView,
    RazorpaySubscriptionWebhookView,
)

urlpatterns = [
    path('payments/create/', CreatePaymentView.as_view(), name='payments-create'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payments-verify'),

    # Razorpay Recurring Subscription Endpoints
    path('payments/subscriptions/create/', CreateStoreSubscriptionView.as_view(), name='sub-create'),
    path('payments/subscriptions/verify/', VerifyStoreSubscriptionView.as_view(), name='sub-verify'),
    path('payments/subscriptions/status/', GetStoreSubscriptionStatusView.as_view(), name='sub-status'),
    path('payments/subscriptions/cancel/', CancelStoreSubscriptionView.as_view(), name='sub-cancel'),
    path('payments/subscriptions/webhook/', RazorpaySubscriptionWebhookView.as_view(), name='sub-webhook'),
]
