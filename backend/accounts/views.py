import csv
from django.http import HttpResponse
from django.db.models import Sum, Count
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import PhoneOTP, PlatformAnnouncement
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, UserSerializer
from stores.models import Store
from orders.models import Order, WhatsAppOrder
from products.models import Product
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


class IsSuperAdminOnly(permissions.BasePermission):
    """Strictly allows access ONLY to the verified platform owner superadmin."""
    def has_permission(self, request, view):
        SUPERADMIN_EMAIL = 'rahulkolhe90.rk.rk@gmail.com'
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            request.user.is_staff and
            request.user.is_superuser and
            request.user.email and
            request.user.email.strip().lower() == SUPERADMIN_EMAIL
        )


class PlatformDashboardView(APIView):
    """Platform-owner-only overview; sellers can never access other stores."""
    permission_classes = [IsSuperAdminOnly]

    def get(self, request):
        stores = Store.objects.select_related('owner').prefetch_related('products', 'whatsapp_orders', 'orders').order_by('-created_at')
        
        total_visits = stores.aggregate(total=Sum('visits_count'))['total'] or 0
        total_products = Product.objects.count()
        total_orders = WhatsAppOrder.objects.count() + Order.objects.count()
        
        wa_revenue = float(WhatsAppOrder.objects.aggregate(total=Sum('total'))['total'] or 0)
        web_revenue = float(Order.objects.aggregate(total=Sum('total'))['total'] or 0)
        total_revenue = float(wa_revenue + web_revenue)

        # Sales & Analytics breakdown (Today & Monthly)
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        today_wa_rev = float(WhatsAppOrder.objects.filter(created_at__gte=today_start).aggregate(t=Sum('total'))['t'] or 0)
        today_web_rev = float(Order.objects.filter(created_at__gte=today_start).aggregate(t=Sum('total'))['t'] or 0)
        today_wa_cnt = WhatsAppOrder.objects.filter(created_at__gte=today_start).count()
        today_web_cnt = Order.objects.filter(created_at__gte=today_start).count()

        monthly_wa_rev = float(WhatsAppOrder.objects.filter(created_at__gte=month_start).aggregate(t=Sum('total'))['t'] or 0)
        monthly_web_rev = float(Order.objects.filter(created_at__gte=month_start).aggregate(t=Sum('total'))['t'] or 0)
        monthly_wa_cnt = WhatsAppOrder.objects.filter(created_at__gte=month_start).count()
        monthly_web_cnt = Order.objects.filter(created_at__gte=month_start).count()

        store_list = []
        for store in stores:
            p_count = store.products.count()
            active_p_count = store.products.filter(is_published=True).count()
            st_wa_orders = store.whatsapp_orders.count()
            st_web_orders = store.orders.count()
            st_orders_count = st_wa_orders + st_web_orders
            
            st_wa_rev = store.whatsapp_orders.aggregate(total=Sum('total'))['total'] or 0
            st_web_rev = store.orders.aggregate(total=Sum('total'))['total'] or 0
            st_revenue = float(st_wa_rev + st_web_rev)

            # Store Today Metrics
            st_today_wa_rev = float(store.whatsapp_orders.filter(created_at__gte=today_start).aggregate(t=Sum('total'))['t'] or 0)
            st_today_web_rev = float(store.orders.filter(created_at__gte=today_start).aggregate(t=Sum('total'))['t'] or 0)
            st_today_revenue = st_today_wa_rev + st_today_web_rev
            st_today_orders = store.whatsapp_orders.filter(created_at__gte=today_start).count() + store.orders.filter(created_at__gte=today_start).count()

            # Store Monthly Metrics
            st_month_wa_rev = float(store.whatsapp_orders.filter(created_at__gte=month_start).aggregate(t=Sum('total'))['t'] or 0)
            st_month_web_rev = float(store.orders.filter(created_at__gte=month_start).aggregate(t=Sum('total'))['t'] or 0)
            st_monthly_revenue = st_month_wa_rev + st_month_web_rev
            st_monthly_orders = store.whatsapp_orders.filter(created_at__gte=month_start).count() + store.orders.filter(created_at__gte=month_start).count()

            # Unique buyers count
            wa_phones = set(store.whatsapp_orders.exclude(customer_phone='').values_list('customer_phone', flat=True))
            unique_buyers = len(wa_phones)

            # Subscription info
            sub_info = {'plan': 'PRO_TRIAL', 'status': 'ACTIVE', 'current_end': None}
            if hasattr(store, 'subscription') and store.subscription:
                sub_info = {
                    'plan': store.subscription.plan_name,
                    'status': store.subscription.status.upper(),
                    'current_end': store.subscription.current_end,
                }

            store_list.append({
                'id': store.id,
                'name': store.name,
                'slug': store.slug,
                'business_type': store.business_type,
                'owner_email': store.owner.email if store.owner else '',
                'owner_name': f"{store.owner.first_name} {store.owner.last_name}".strip() if store.owner else 'Seller',
                'owner_phone': store.phone_number or (store.owner.phone_number if store.owner else ''),
                'is_published': store.is_published,
                'visits_count': store.visits_count,
                'products_count': p_count,
                'active_products_count': active_p_count,
                'orders_count': st_orders_count,
                'wa_orders_count': st_wa_orders,
                'web_orders_count': st_web_orders,
                'unique_buyers': unique_buyers,
                'subscription': sub_info,
                'revenue': st_revenue,
                'today_revenue': st_today_revenue,
                'today_orders': st_today_orders,
                'monthly_revenue': st_monthly_revenue,
                'monthly_orders': st_monthly_orders,
                'created_at': store.created_at,
            })

        # Top 5 Stores Leaderboard
        top_stores = sorted(store_list, key=lambda x: x['revenue'], reverse=True)[:5]

        # Active Announcement
        active_announcement = PlatformAnnouncement.objects.filter(is_active=True).order_by('-created_at').first()
        announcement_data = None
        if active_announcement:
            announcement_data = {
                'id': active_announcement.id,
                'message': active_announcement.message,
                'level': active_announcement.level,
                'created_at': active_announcement.created_at
            }

        return Response({
            'stats': {
                'total_sellers': User.objects.filter(is_staff=False).count(),
                'total_stores': stores.count(),
                'published_stores': stores.filter(is_published=True).count(),
                'draft_stores': stores.filter(is_published=False).count(),
                'total_visits': total_visits,
                'total_orders': total_orders,
                'total_products': total_products,
                'total_revenue': total_revenue,
            },
            'analytics': {
                'today_sales': today_wa_rev + today_web_rev,
                'today_orders': today_wa_cnt + today_web_cnt,
                'monthly_sales': monthly_wa_rev + monthly_web_rev,
                'monthly_orders': monthly_wa_cnt + monthly_web_cnt,
                'wa_sales_total': wa_revenue,
                'web_sales_total': web_revenue,
                'top_stores': top_stores,
            },
            'announcement': announcement_data,
            'stores': store_list,
        })


class AdminToggleStoreStatusView(APIView):
    """Admin endpoint to publish/unpublish any store."""
    permission_classes = [IsSuperAdminOnly]

    def post(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({'detail': 'Store not found'}, status=404)
        
        store.is_published = not store.is_published
        store.status = Store.STATUS_PUBLISHED if store.is_published else Store.STATUS_DRAFT
        store.save(update_fields=['is_published', 'status'])
        
        return Response({
            'success': True,
            'is_published': store.is_published,
            'status': store.status,
            'message': f"Store '{store.name}' is now {'LIVE' if store.is_published else 'DRAFT'}."
        })


class AdminDeactivateStoreView(APIView):
    """Superadmin action to suspend/deactivate a seller store."""
    permission_classes = [IsSuperAdminOnly]

    def post(self, request, store_id):
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({'detail': 'Store not found'}, status=404)
        
        now = timezone.now()
        store.is_published = False
        store.status = Store.STATUS_ARCHIVED
        store.save(update_fields=['is_published', 'status'])
        
        if store.owner and not store.owner.is_staff:
            store.owner.is_active = False
            store.owner.deleted_at = now
            store.owner.deletion_requested_at = now
            store.owner.save(update_fields=['is_active', 'deleted_at', 'deletion_requested_at'])
            
        return Response({
            'success': True,
            'message': f"Store '{store.name}' and seller account have been deactivated."
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
    permission_classes = [IsSuperAdminOnly]

    def get(self, request):
        sellers = User.objects.filter(is_staff=False, deleted_at__isnull=False).order_by('-deleted_at')
        return Response({'results': [{'id': user.id, 'email': user.email, 'phone_number': user.phone_number, 'deleted_at': user.deleted_at} for user in sellers]})


class RestoreDeletedSellerView(APIView):
    permission_classes = [IsSuperAdminOnly]

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
            store = Store.objects.filter(owner=user).first()
            stores_count = Store.objects.filter(owner=user).count()
            refresh = RefreshToken.for_user(user)
            return Response({
                'success': True,
                'is_new_user': False,
                'has_store': stores_count > 0,
                'stores_count': stores_count,
                'store': {'id': store.id, 'name': store.name, 'slug': store.slug} if store else None,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        else:
            return Response({
                'success': True,
                'is_new_user': True,
                'has_store': False,
                'stores_count': 0,
                'store': None,
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
        business_type = request.data.get('business_type', 'GENERAL').strip().upper()
        address = request.data.get('address', '').strip()
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        email = request.data.get('email', '').strip().lower()

        clean_phone = normalize_phone(phone_number)
        if not clean_phone or len(clean_phone) < 10:
            return Response({'detail': 'Valid 10-digit phone number is required.'}, status=400)

        # Registration is allowed if OTP proof verified OR user is logged in session OR valid OTP provided.
        verified = PhoneOTP.objects.filter(
            phone_number=clean_phone, is_verified=True, expires_at__gte=timezone.now()
        ).order_by('-created_at').first()

        if not verified:
            if request.user and request.user.is_authenticated and (request.user.phone_number == clean_phone or not request.user.phone_number):
                pass
            elif not otp:
                return Response({'detail': 'Please verify your mobile number with OTP first.'}, status=400)
            else:
                is_valid, msg = verify_otp(clean_phone, otp)
                if not is_valid:
                    return Response({'detail': msg}, status=400)
                verified = PhoneOTP.objects.filter(
                    phone_number=clean_phone, is_verified=True, expires_at__gte=timezone.now()
                ).order_by('-created_at').first()

        if not email:
            email = f"user_{clean_phone}@store.local"
            i = 1
            while User.objects.filter(email=email).exists():
                email = f"user_{clean_phone}_{i}@store.local"
                i += 1
        elif User.objects.filter(email=email).exclude(phone_number=clean_phone).exists():
            return Response({'detail': 'An account with this email address already exists.'}, status=400)

        if request.user and request.user.is_authenticated:
            user = request.user
            if clean_phone and not user.phone_number:
                user.phone_number = clean_phone
            if first_name: user.first_name = first_name
            if last_name: user.last_name = last_name
            user.save()
        else:
            user, created = User.objects.get_or_create(
                phone_number=clean_phone,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_staff': False,
                    'is_superuser': False,
                }
            )
            if not created:
                if first_name: user.first_name = first_name
                if last_name: user.last_name = last_name
                user.save()
            else:
                user.set_unusable_password()
                user.save()

        # Check if user already has a store with this exact name, or if we should create a new store
        store = Store.objects.filter(owner=user, name=store_name).first() if store_name else Store.objects.filter(owner=user).first()
        if not store:
            if not store_name:
                store_name = f"{first_name or 'My'} Store"
            store = Store.objects.create(
                owner=user,
                name=store_name,
                description=f"Store category: {category}" if category else "",
                business_type=business_type if business_type else 'GENERAL',
                address=address,
                latitude=latitude or None,
                longitude=longitude or None,
                phone_number=clean_phone,
                status=Store.STATUS_PUBLISHED,
                is_published=True,
                manage_in_app=True,
            )

        if verified:
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


class AdminStoreCustomersView(APIView):
    """Returns all unique customer profiles for a specific store including addresses, spending, order counts, and dates."""
    permission_classes = [IsSuperAdminOnly]

    def get(self, request, store_id):
        from decimal import Decimal
        store = Store.objects.filter(id=store_id).first()
        if not store:
            return Response({'detail': 'Store not found'}, status=404)
        
        wa_orders = WhatsAppOrder.objects.filter(store=store).order_by('created_at')
        
        customer_map = {}
        for o in wa_orders:
            phone = (o.customer_phone or '').strip()
            if not phone:
                continue
            
            if phone not in customer_map:
                customer_map[phone] = {
                    'phone': phone,
                    'name': o.customer_name or 'Customer',
                    'latest_address': o.delivery_address or 'N/A',
                    'total_orders': 0,
                    'total_spent': Decimal('0.00'),
                    'first_order_at': o.created_at,
                    'last_order_at': o.created_at,
                    'addresses': set()
                }
            
            c = customer_map[phone]
            if o.customer_name and c['name'] == 'Customer':
                c['name'] = o.customer_name
            if o.delivery_address:
                c['latest_address'] = o.delivery_address
                c['addresses'].add(o.delivery_address)
            
            c['total_orders'] += 1
            c['total_spent'] += (o.total or Decimal('0.00'))
            c['last_order_at'] = o.created_at

        customers = []
        for phone, data in customer_map.items():
            customers.append({
                'phone': data['phone'],
                'name': data['name'],
                'address': data['latest_address'],
                'all_addresses': list(data['addresses']),
                'total_orders': data['total_orders'],
                'total_spent': float(data['total_spent']),
                'first_order_at': data['first_order_at'],
                'last_order_at': data['last_order_at']
            })
            
        customers.sort(key=lambda x: x['total_spent'], reverse=True)
        
        return Response({
            'store_id': store.id,
            'store_name': store.name,
            'total_unique_customers': len(customers),
            'customers': customers
        })


class PublicPlatformAnnouncementView(APIView):
    """Public endpoint for sellers to get active platform announcement banner."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        announcement = PlatformAnnouncement.objects.filter(is_active=True).order_by('-created_at').first()
        if not announcement:
            return Response({'announcement': None})
        return Response({
            'announcement': {
                'id': announcement.id,
                'message': announcement.message,
                'level': announcement.level,
                'created_at': announcement.created_at
            }
        })


class AdminPlatformAnnouncementView(APIView):
    """Admin endpoint to set or deactivate platform announcement."""
    permission_classes = [IsSuperAdminOnly]

    def post(self, request):
        message = request.data.get('message', '').strip()
        level = request.data.get('level', 'INFO')
        is_active = request.data.get('is_active', True)

        if not message and is_active:
            # Deactivate all active announcements
            PlatformAnnouncement.objects.filter(is_active=True).update(is_active=False)
            return Response({'message': 'Platform announcement cleared.'})

        # Deactivate previous active announcements
        PlatformAnnouncement.objects.filter(is_active=True).update(is_active=False)

        if is_active and message:
            announcement = PlatformAnnouncement.objects.create(
                message=message,
                level=level,
                is_active=True
            )
            return Response({
                'message': 'Announcement published live to all seller dashboards!',
                'announcement': {
                    'id': announcement.id,
                    'message': announcement.message,
                    'level': announcement.level,
                    'created_at': announcement.created_at
                }
            })
        
        return Response({'message': 'Announcement updated.'})


class AdminExportStoresCSVView(APIView):
    """Admin endpoint to download a complete 1-Click CSV report of all stores."""
    permission_classes = [IsSuperAdminOnly]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        filename = f"apani_dukan_stores_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'Store ID', 'Store Name', 'Category', 'Status', 'Owner Name', 
            'Owner Email', 'Owner Phone', 'Visits Count', 'Unique Customers',
            'Listed Products', 'Total Orders', 'Total Sales (INR)', 'Joined Date'
        ])

        stores = Store.objects.select_related('owner').prefetch_related('products', 'whatsapp_orders', 'orders').order_by('-created_at')
        for st in stores:
            st_wa_rev = st.whatsapp_orders.aggregate(total=Sum('total'))['total'] or 0
            st_web_rev = st.orders.aggregate(total=Sum('total'))['total'] or 0
            st_revenue = float(st_wa_rev + st_web_rev)

            wa_phones = set(st.whatsapp_orders.exclude(customer_phone='').values_list('customer_phone', flat=True))
            unique_buyers = len(wa_phones)

            writer.writerow([
                st.id,
                st.name,
                st.business_type or 'GENERAL',
                'LIVE' if st.is_published else 'DRAFT',
                f"{st.owner.first_name} {st.owner.last_name}".strip() if st.owner else 'N/A',
                st.owner.email if st.owner else 'N/A',
                st.phone_number or (st.owner.phone_number if st.owner else 'N/A'),
                st.visits_count or 0,
                unique_buyers,
                st.products.count(),
                st.whatsapp_orders.count() + st.orders.count(),
                f"Rs. {st_revenue:.2f}",
                st.created_at.strftime('%d-%b-%Y') if st.created_at else 'N/A'
            ])

        return response

