from django.urls import path
from .views import (
    CreateOrderView, ListOrdersView, OrderDetailView, ListAccessesView,
    PublicCheckoutPhoneOTPSendView, PublicCheckoutPhoneOTPVerifyView, PublicWhatsAppOrderView, PublicCustomerOrdersListView, PublicCustomerOrdersVerifyPhoneView, PublicCustomerAllOrdersView, PublicCustomerNotificationsView, PublicWhatsAppOrderDetailView, PublicQuickReorderView,
    SellerWhatsAppOrdersView, SellerWhatsAppOrderCountView, PublicCustomerWalletView, PublicCustomerCancelOrderView,
    SellerResendWhatsAppInvoiceView, PublicOrderIssueRequestView, SellerOrderIssueRequestView,
    SellerDeliveryOTPView, SellerExchangeCompletionOTPView
)
from .delivery_views import (
    SellerDeliveryAgentsView, SellerDeliveryAgentDetailView, SellerAssignDeliveryAgentView,
    DeliveryChangePasswordView, DeliveryOrdersView, DeliveryOrderStatusView, DeliveryOrderOTPView,
    DeliveryOrderCancellationOTPView,
)

urlpatterns = [
    path('delivery/change-password/', DeliveryChangePasswordView.as_view()),
    path('delivery/orders/', DeliveryOrdersView.as_view()),
    path('delivery/orders/<int:order_id>/status/', DeliveryOrderStatusView.as_view()),
    path('delivery/orders/<int:order_id>/delivery-otp/', DeliveryOrderOTPView.as_view()),
    path('delivery/orders/<int:order_id>/cancellation-otp/', DeliveryOrderCancellationOTPView.as_view()),
    path('seller/stores/<int:store_id>/delivery-agents/', SellerDeliveryAgentsView.as_view()),
    path('seller/stores/<int:store_id>/delivery-agents/<int:agent_id>/', SellerDeliveryAgentDetailView.as_view()),
    path('seller/stores/<int:store_id>/whatsapp-orders/<int:order_id>/assign-agent/', SellerAssignDeliveryAgentView.as_view()),
    path('orders/', CreateOrderView.as_view(), name='create-order'),
    path('orders/list/', ListOrdersView.as_view(), name='list-orders'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/accesses/', ListAccessesView.as_view(), name='list-accesses'),
    path('public/stores/<slug:slug>/checkout-phone/send-otp/', PublicCheckoutPhoneOTPSendView.as_view(), name='public-checkout-phone-send-otp'),
    path('public/stores/<slug:slug>/checkout-phone/verify-otp/', PublicCheckoutPhoneOTPVerifyView.as_view(), name='public-checkout-phone-verify-otp'),
    path('public/stores/<slug:slug>/whatsapp-orders/', PublicWhatsAppOrderView.as_view(), name='public-whatsapp-order'),
    path('public/stores/<slug:slug>/customer-orders/', PublicCustomerOrdersListView.as_view(), name='public-customer-orders-list'),
    path('public/customer-orders/verify-phone/', PublicCustomerOrdersVerifyPhoneView.as_view(), name='public-customer-orders-verify-phone'),
    path('public/customer-orders/', PublicCustomerAllOrdersView.as_view(), name='public-customer-all-orders'),
    path('public/customer-notifications/', PublicCustomerNotificationsView.as_view(), name='public-customer-notifications'),
    path('public/stores/<slug:slug>/orders/<str:reference>/', PublicWhatsAppOrderDetailView.as_view(), name='public-whatsapp-order-detail'),
    path('public/stores/<slug:slug>/orders/<str:reference>/cancel/', PublicCustomerCancelOrderView.as_view(), name='public-customer-cancel-order'),
    path('public/stores/<slug:slug>/orders/<str:reference>/quick-reorder/', PublicQuickReorderView.as_view(), name='public-quick-reorder'),
    path('public/stores/<slug:slug>/orders/<str:reference>/issues/', PublicOrderIssueRequestView.as_view(), name='public-order-issues'),
    path('public/stores/<slug:slug>/wallet/', PublicCustomerWalletView.as_view(), name='public-customer-wallet'),
    path('seller/stores/<int:store_id>/whatsapp-orders/', SellerWhatsAppOrdersView.as_view(), name='seller-whatsapp-orders'),
    path('seller/stores/<int:store_id>/whatsapp-orders/count/', SellerWhatsAppOrderCountView.as_view(), name='seller-whatsapp-order-count'),
    path('seller/stores/<int:store_id>/whatsapp-orders/<int:order_id>/', SellerWhatsAppOrdersView.as_view(), name='seller-whatsapp-order-update'),
    path('seller/stores/<int:store_id>/whatsapp-orders/<int:order_id>/send-invoice/', SellerResendWhatsAppInvoiceView.as_view(), name='seller-whatsapp-order-send-invoice'),
    path('seller/stores/<int:store_id>/whatsapp-orders/<int:order_id>/delivery-otp/', SellerDeliveryOTPView.as_view(), name='seller-delivery-otp'),
    path('seller/stores/<int:store_id>/order-issues/', SellerOrderIssueRequestView.as_view(), name='seller-order-issues'),
    path('seller/stores/<int:store_id>/order-issues/<int:issue_id>/', SellerOrderIssueRequestView.as_view(), name='seller-order-issue-update'),
    path('seller/stores/<int:store_id>/order-issues/<int:issue_id>/completion-otp/', SellerExchangeCompletionOTPView.as_view(), name='seller-exchange-completion-otp'),
]
