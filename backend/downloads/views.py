from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import DownloadToken
from storage import get_storage
from django.http import FileResponse, HttpResponseRedirect


class DownloadView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        dt = get_object_or_404(DownloadToken, token=token)
        if not dt.is_valid():
            return Response({'success': False, 'message': 'Invalid or expired token'}, status=status.HTTP_404_NOT_FOUND)

        storage = get_storage()
        file_name = dt.file_path

        # If S3, return signed URL redirect
        if hasattr(storage, 'get_signed_url') and storage.__class__.__name__ == 'S3Storage':
            url = storage.get_signed_url(file_name, expires=300)
            return HttpResponseRedirect(url)

        # Local storage: stream file
        if storage.exists(file_name):
            fh = storage.open(file_name, 'rb')
            content_type = 'application/octet-stream'
            return FileResponse(fh, as_attachment=True, filename=file_name.split('/')[-1], content_type=content_type)

        return Response({'success': False, 'message': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
