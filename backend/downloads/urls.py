from django.urls import path
from .views import DownloadView

urlpatterns = [
    path('downloads/<uuid:token>/', DownloadView.as_view(), name='download-token'),
]
