from django.urls import path
from .views import CreatePaymentView, VerifyPaymentView

urlpatterns = [
    path('payments/create/', CreatePaymentView.as_view(), name='payments-create'),
    path('payments/verify/', VerifyPaymentView.as_view(), name='payments-verify'),
]
