from django.urls import path
from .views import CartView, AddCartItemView, RemoveCartItemView

urlpatterns = [
    path('cart/', CartView.as_view(), name='cart'),
    path('cart/items/', AddCartItemView.as_view(), name='cart-add-item'),
    path('cart/items/<int:pk>/', RemoveCartItemView.as_view(), name='cart-remove-item'),
]
