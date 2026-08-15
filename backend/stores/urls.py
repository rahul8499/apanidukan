from rest_framework.routers import DefaultRouter
from .views import StoreViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'stores', StoreViewSet, basename='stores')

urlpatterns = [
    path('', include(router.urls)),
]
