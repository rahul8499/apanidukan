from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path
from django.http import Http404
from stores.public_views import (
    PublicProductDetailView,
    PublicStoreCategoriesView,
    PublicStoreDetailView,
    PublicStoreProductsView,
    PublicRecordSearchView,
    PublicAiSearchView,
    PublicStoreCouponsView,
    PublicValidateCouponView,
)

urlpatterns = [
    # Private purchased files must only be served through the download-token endpoint.
    re_path(r'^media/products/files/private/.*$', lambda request: (_ for _ in ()).throw(Http404())),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/', include('stores.urls')),
    path('api/v1/', include('categories.urls')),
    path('api/v1/', include('products.urls')),
    path('api/v1/', include('downloads.urls')),
    path('api/v1/', include('cart.urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('payments.urls')),
    path('api/v1/', include('chat.urls')),
    path('api/v1/', include('ai_assistant.urls')), 
    # Public storefront
    path('api/v1/public/stores/<slug:slug>/', PublicStoreDetailView.as_view()),
    path('api/v1/public/stores/<slug:slug>/categories/', PublicStoreCategoriesView.as_view()),
    path('api/v1/public/stores/<slug:slug>/products/', PublicStoreProductsView.as_view()),
    path('api/v1/public/stores/<slug:slug>/products/<slug:product_slug>/', PublicProductDetailView.as_view()),
    path('api/v1/public/stores/<slug:slug>/record-search/', PublicRecordSearchView.as_view()),
    path('api/v1/public/stores/<slug:slug>/ai-search/', PublicAiSearchView.as_view()),
    path('api/v1/public/stores/<slug:slug>/coupons/', PublicStoreCouponsView.as_view()),
    path('api/v1/public/stores/<slug:slug>/validate-coupon/', PublicValidateCouponView.as_view()),
]

from django.contrib.staticfiles.urls import staticfiles_urlpatterns

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += staticfiles_urlpatterns()
