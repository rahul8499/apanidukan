from django.urls import path
from .views import (
    CreateOrderView, ListOrdersView, OrderDetailView, ListAccessesView,
    PublicWhatsAppOrderView, PublicCustomerOrdersListView, PublicWhatsAppOrderDetailView, PublicQuickReorderView,
    SellerWhatsAppOrdersView, PublicCustomerWalletView
)

urlpatterns = [
    path('orders/', CreateOrderView.as_view(), name='create-order'),
    path('orders/list/', ListOrdersView.as_view(), name='list-orders'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/accesses/', ListAccessesView.as_view(), name='list-accesses'),
    path('public/stores/<slug:slug>/whatsapp-orders/', PublicWhatsAppOrderView.as_view(), name='public-whatsapp-order'),
    path('public/stores/<slug:slug>/customer-orders/', PublicCustomerOrdersListView.as_view(), name='public-customer-orders-list'),
    path('public/stores/<slug:slug>/orders/<str:reference>/', PublicWhatsAppOrderDetailView.as_view(), name='public-whatsapp-order-detail'),
    path('public/stores/<slug:slug>/orders/<str:reference>/quick-reorder/', PublicQuickReorderView.as_view(), name='public-quick-reorder'),
    path('public/stores/<slug:slug>/wallet/', PublicCustomerWalletView.as_view(), name='public-customer-wallet'),
    path('seller/stores/<int:store_id>/whatsapp-orders/', SellerWhatsAppOrdersView.as_view(), name='seller-whatsapp-orders'),
    path('seller/stores/<int:store_id>/whatsapp-orders/<int:order_id>/', SellerWhatsAppOrdersView.as_view(), name='seller-whatsapp-order-update'),
]

