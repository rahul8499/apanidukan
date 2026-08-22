from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import PhoneOTP
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer
from stores.models import Store
from orders.models import Order, WhatsAppOrder
from .services import create_and_send_otp, verify_otp, normalize_phone, verify_msg91_widget_token

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
            send_mail('Reset your Apani Dukan password', f'Use this link to reset your password:\n{link}', settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
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


class AccountDeletionRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        stores = Store.objects.filter(owner=request.user)
        open_orders = Order.objects.filter(store__in=stores, status__in=[Order.STATUS_PENDING, Order.STATUS_PAID]).count()
        open_whatsapp = WhatsAppOrder.objects.filter(store__in=stores, status__in=[WhatsAppOrder.STATUS_NEW, WhatsAppOrder.STATUS_CONFIRMED, WhatsAppOrder.STATUS_PAID]).count()
        if open_orders or open_whatsapp:
            return Response({'detail': 'Resolve all pending or paid customer orders before deactivating the account.', 'orders': open_orders, 'whatsapp_orders': open_whatsapp}, status=409)
        now = timezone.now()
        stores.update(is_published=False, status=Store.STATUS_ARCHIVED)
        request.user.is_active = False
        request.user.deletion_requested_at = now
        request.user.deleted_at = now
        request.user.save(update_fields=['is_active', 'deletion_requested_at', 'deleted_at'])
        return Response({'success': True, 'message': 'Account deactivated and storefront unpublished.'})


class DeletedSellerAdminView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        sellers = User.objects.filter(is_staff=False, deleted_at__isnull=False).order_by('-deleted_at')
        return Response({'results': [{'id': user.id, 'email': user.email, 'phone_number': user.phone_number, 'deleted_at': user.deleted_at} for user in sellers]})


class RestoreDeletedSellerView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        user = User.objects.filter(id=user_id, is_staff=False, deleted_at__isnull=False).first()
        if not user:
            return Response({'detail': 'Deleted seller not found.'}, status=404)
        user.is_active = True
        user.deleted_at = None
        user.deletion_requested_at = None
        user.save(update_fields=['is_active', 'deleted_at', 'deletion_requested_at'])
        return Response({'success': True, 'message': 'Seller restored. Store remains unpublished for review.'})


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        phone_number = request.data.get('phone_number', '')
        if not phone_number:
            return Response({'detail': 'Phone number is required.'}, status=400)
        
        clean_phone = normalize_phone(phone_number)
        if not clean_phone or len(clean_phone) < 10:
            return Response({'detail': 'Please enter a valid 10-digit mobile number.'}, status=400)

        if request.data.get('provider_only'):
            return Response({
                'success': True,
                'phone_number': clean_phone,
                'user_exists': User.objects.filter(phone_number=clean_phone).exists()
            })

        success, otp_code, msg = create_and_send_otp(clean_phone)
        if not success:
            return Response({'detail': msg}, status=400)

        user_exists = User.objects.filter(phone_number=clean_phone).exists()
        return Response({
            'success': True,
            'message': msg,
            'phone_number': clean_phone,
            'user_exists': user_exists
        })


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        phone_number = request.data.get('phone_number', '')
        otp = request.data.get('otp', '')
        access_token = request.data.get('access_token', '')

        clean_phone = normalize_phone(phone_number) if phone_number else ''

        if access_token:
            widget_res = verify_msg91_widget_token(access_token)
            if not widget_res.get('success'):
                return Response({'detail': 'MSG91 token verification failed.'}, status=400)
            clean_phone = clean_phone or normalize_phone(widget_res.get('data', {}).get('mobile', ''))
            is_valid = True
            msg = 'OTP verified via MSG91.'
            # Retain only a short-lived proof for the onboarding completion step.
            PhoneOTP.objects.filter(phone_number=clean_phone, is_verified=False).delete()
            PhoneOTP.objects.create(
                phone_number=clean_phone, otp_code='', is_verified=True,
                expires_at=timezone.now() + timedelta(minutes=15)
            )
        else:
            if not clean_phone or not otp:
                return Response({'detail': 'Phone number and OTP code are required.'}, status=400)
            is_valid, msg = verify_otp(clean_phone, otp)

        if not is_valid:
            return Response({'detail': msg}, status=400)

        user = User.objects.filter(phone_number=clean_phone).first()

        if user:

            refresh = RefreshToken.for_user(user)
            return Response({
                'success': True,
                'is_new_user': False,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        else:
            return Response({
                'success': True,
                'is_new_user': True,
                'phone_number': clean_phone,
                'message': 'OTP verified! Complete your account details to start your store.'
            })


class OTPRegisterCompleteView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        phone_number = request.data.get('phone_number', '')
        otp = request.data.get('otp', '')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        store_name = request.data.get('store_name', '').strip()
        category = request.data.get('category', '').strip()
        email = request.data.get('email', '').strip().lower()

        clean_phone = normalize_phone(phone_number)
        if not clean_phone or len(clean_phone) < 10:
            return Response({'detail': 'Valid 10-digit phone number is required.'}, status=400)

        # Registration is allowed only after an OTP was actually verified.
        # Widget verification creates this short-lived proof in VerifyOTPView.
        verified = PhoneOTP.objects.filter(
            phone_number=clean_phone, is_verified=True, expires_at__gte=timezone.now()
        ).order_by('-created_at').first()
        if not verified:
            if not otp:
                return Response({'detail': 'Please verify your mobile number with OTP first.'}, status=400)
            is_valid, msg = verify_otp(clean_phone, otp)
            if not is_valid:
                return Response({'detail': msg}, status=400)
            verified = PhoneOTP.objects.filter(
                phone_number=clean_phone, is_verified=True, expires_at__gte=timezone.now()
            ).order_by('-created_at').first()
            if not verified:
                return Response({'detail': 'OTP verification could not be confirmed.'}, status=400)

        if not email:
            email = f"user_{clean_phone}@store.local"
            i = 1
            while User.objects.filter(email=email).exists():
                email = f"user_{clean_phone}_{i}@store.local"
                i += 1
        elif User.objects.filter(email=email).exclude(phone_number=clean_phone).exists():
            return Response({'detail': 'An account with this email address already exists.'}, status=400)

        user, created = User.objects.get_or_create(
            phone_number=clean_phone,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        if not created:
            if first_name: user.first_name = first_name
            if last_name: user.last_name = last_name
            user.save()
        else:
            user.set_unusable_password()
            user.save()

        store = Store.objects.filter(owner=user).first()
        if not store:
            if not store_name:
                store_name = f"{first_name or 'My'} Store"
            store = Store.objects.create(
                owner=user,
                name=store_name,
                description=f"Store category: {category}" if category else "",
                phone_number=clean_phone,
                status=Store.STATUS_PUBLISHED,
                is_published=True,
                manage_in_app=True,
            )

        # A verification proof is single-use; prevent it from being replayed.
        verified.expires_at = timezone.now()
        verified.save(update_fields=["expires_at"])

        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'store': {
                'id': store.id,
                'name': store.name,
                'slug': store.slug
            }
        })
