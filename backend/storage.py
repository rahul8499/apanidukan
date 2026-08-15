import os
import mimetypes
from urllib.parse import urljoin
from django.conf import settings

class LocalStorage:
    def __init__(self):
        self.media_root = settings.MEDIA_ROOT

    def path(self, name):
        return os.path.join(self.media_root, name)

    def exists(self, name):
        return os.path.exists(self.path(name))

    def open(self, name, mode='rb'):
        return open(self.path(name), mode)

    def url(self, name):
        # Not suitable for private files; only for public media
        return urljoin('/', os.path.join(settings.MEDIA_URL.lstrip('/'), name))

    def get_signed_url(self, name, expires=60):
        # Local storage cannot generate signed URLs; return direct path if MEDIA served by webserver
        return self.url(name)


class S3Storage:
    def __init__(self):
        import boto3
        from botocore.client import Config
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT or None,
            config=Config(signature_version='s3v4')
        )
        self.bucket = settings.S3_BUCKET

    def exists(self, name):
        try:
            self.s3.head_object(Bucket=self.bucket, Key=name)
            return True
        except Exception:
            return False

    def get_signed_url(self, name, expires=60):
        return self.s3.generate_presigned_url('get_object', Params={'Bucket': self.bucket, 'Key': name}, ExpiresIn=expires)

    def open(self, name, mode='rb'):
        # For streaming, return a file-like object via boto3
        obj = self.s3.get_object(Bucket=self.bucket, Key=name)
        return obj['Body']


def get_storage():
    backend = getattr(settings, 'MEDIA_STORAGE', 'local')
    if backend == 's3':
        return S3Storage()
    return LocalStorage()
