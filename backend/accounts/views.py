from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.throttling import AnonRateThrottle
from .serializers import RegisterSerializer, UserSerializer
from stores.models import Store
from orders.models import Order

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({'success': True, 'data': serializer.data})


class PlatformDashboardView(APIView):
    """Platform-owner-only overview; sellers can never access other stores."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        stores = Store.objects.select_related('owner').order_by('-created_at')
        return Response({
            'stats': {
                'sellers': User.objects.filter(is_staff=False).count(),
                'stores': stores.count(),
                'published_stores': stores.filter(is_published=True).count(),
                'orders': Order.objects.count(),
            },
            'stores': [{
                'id': store.id,
                'name': store.name,
                'slug': store.slug,
                'owner_email': store.owner.email,
                'is_published': store.is_published,
                'created_at': store.created_at,
            } for store in stores],
        })


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}"
            send_mail('Reset your MultiStore password', f'Use this link to reset your password:\n{link}', settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return Response({'success': True, 'message': 'If this email exists, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request, uid, token):
        try: user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError): return Response({'detail': 'Invalid reset link.'}, status=400)
        password = request.data.get('password', '')
        try: from django.contrib.auth.password_validation import validate_password; validate_password(password, user)
        except Exception as error: return Response({'detail': list(getattr(error, 'messages', ['Invalid password.']))}, status=400)
        if not default_token_generator.check_token(user, token): return Response({'detail': 'Reset link expired or invalid.'}, status=400)
        user.set_password(password); user.save()
        return Response({'success': True})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken, TokenError
        try: RefreshToken(request.data.get('refresh')).blacklist()
        except (TokenError, AttributeError): pass
        return Response(status=204)
