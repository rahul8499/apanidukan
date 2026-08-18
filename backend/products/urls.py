from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CouponViewSet, PresignedUploadView
from django.urls import path, include

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'coupons', CouponViewSet, basename='coupons')

urlpatterns = [
    path('uploads/presigned-url/', PresignedUploadView.as_view(), name='presigned-upload'),
    path('', include(router.urls)),
]

