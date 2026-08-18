import os
import mimetypes
from urllib.parse import urljoin
from django.conf import settings
from django.core.files.storage import Storage, FileSystemStorage
from django.core.files.base import ContentFile
import boto3
from botocore.client import Config


class LocalStorage(FileSystemStorage):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def get_signed_url(self, name, expires=60):
        return self.url(name)

    def get_presigned_upload_url(self, name, content_type='image/jpeg', expires=3600):
        # Local storage direct upload fallback returns relative upload path
        return {
            'upload_url': None,
            'file_url': self.url(name),
            'key': name,
            'storage': 'local'
        }


class S3Storage(Storage):
    def __init__(self, bucket=None, access_key=None, secret_key=None, region=None, endpoint=None):
        self.bucket = bucket or getattr(settings, 'S3_BUCKET', None)
        self.access_key = access_key or getattr(settings, 'S3_ACCESS_KEY', None)
        self.secret_key = secret_key or getattr(settings, 'S3_SECRET_KEY', None)
        self.region = region or getattr(settings, 'S3_REGION', 'eu-north-1')
        self.endpoint = endpoint or getattr(settings, 'S3_ENDPOINT', None)

        client_kwargs = {
            'service_name': 's3',
            'aws_access_key_id': self.access_key,
            'aws_secret_access_key': self.secret_key,
            'config': Config(signature_version='s3v4', region_name=self.region)
        }
        if self.endpoint:
            client_kwargs['endpoint_url'] = self.endpoint

        self.s3 = boto3.client(**client_kwargs)

    def _open(self, name, mode='rb'):
        try:
            obj = self.s3.get_object(Bucket=self.bucket, Key=name)
            return ContentFile(obj['Body'].read(), name=name)
        except Exception as e:
            raise IOError(f"Could not open S3 file {name}: {str(e)}")

    def _save(self, name, content):
        content_type, _ = mimetypes.guess_type(name)
        if not content_type:
            content_type = 'application/octet-stream'

        extra_args = {'ContentType': content_type}

        # Reset content pointer if possible
        if hasattr(content, 'seek'):
            content.seek(0)

        self.s3.upload_fileobj(
            Fileobj=content,
            Bucket=self.bucket,
            Key=name,
            ExtraArgs=extra_args
        )
        return name

    def delete(self, name):
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=name)
        except Exception:
            pass

    def exists(self, name):
        if not name:
            return False
        try:
            self.s3.head_object(Bucket=self.bucket, Key=name)
            return True
        except Exception:
            return False

    def url(self, name):
        if not name:
            return ''
        if name.startswith('http://') or name.startswith('https://'):
            return name
        
        try:
            expiry = getattr(settings, 'S3_PRESIGNED_EXPIRY', 604800)
            return self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': name.lstrip('/')},
                ExpiresIn=expiry
            )
        except Exception:
            if self.endpoint:
                base_endpoint = self.endpoint.rstrip('/')
                return f"{base_endpoint}/{self.bucket}/{name.lstrip('/')}"
            return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{name.lstrip('/')}"

    def get_signed_url(self, name, expires=3600):
        if not name:
            return ''
        if name.startswith('http://') or name.startswith('https://'):
            return name
        try:
            return self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': name.lstrip('/')},
                ExpiresIn=expires
            )
        except Exception:
            return self.url(name)

    def get_presigned_upload_url(self, name, content_type='image/jpeg', expires=3600):
        key = name.lstrip('/')
        params = {
            'Bucket': self.bucket,
            'Key': key,
            'ContentType': content_type
        }
        upload_url = self.s3.generate_presigned_url(
            'put_object',
            Params=params,
            ExpiresIn=expires
        )
        file_url = self.url(key)
        return {
            'upload_url': upload_url,
            'file_url': file_url,
            'key': key,
            'storage': 's3',
            'expires_in': expires
        }


def get_storage():
    backend = getattr(settings, 'MEDIA_STORAGE', 'local')
    if backend == 's3':
        return S3Storage()
    return LocalStorage()
