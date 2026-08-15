from django.urls import path
from . import views

urlpatterns = [
    path('stores/<int:store_id>/categories/', views.CategoryListCreateView.as_view(), name='store-categories'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category-detail'),
]
