import os
from pathlib import Path
import hmac
import hashlib
import json
import logging
import razorpay
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from stores.models import Store
from .models import StoreSubscription, SubscriptionPaymentHistory, SubscriptionPlan

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def get_razorpay_client():
    load_dotenv(getattr(settings, 'BASE_DIR', Path(__file__).resolve().parent.parent) / '.env', override=True)
    key_id = (os.getenv('RAZORPAY_KEY_ID') or getattr(settings, 'RAZORPAY_KEY_ID', '')).strip(" '\"")
    key_secret = (os.getenv('RAZORPAY_KEY_SECRET') or getattr(settings, 'RAZORPAY_KEY_SECRET', '')).strip(" '\"")
    return razorpay.Client(auth=(key_id, key_secret))


def ensure_default_plans_exist():
    """Ensure default BASIC and PREMIUM plans exist in DB if not created yet."""
    try:
        SubscriptionPlan.objects.get_or_create(
            name=SubscriptionPlan.PLAN_BASIC,
            defaults={
                'plan_id': 'plan_TBseXQU7BYzIG5',
                'amount': 0.00,
                'currency': 'INR',
                'period': 'Every Month',
                'description': 'Standard Store Manager Features',
                'is_active': True,
            }
        )

        SubscriptionPlan.objects.get_or_create(
            name=SubscriptionPlan.PLAN_PREMIUM,
            defaults={
                'plan_id': 'plan_TBsfoswSWV4H7Q',
                'amount': 2000.00,
                'currency': 'INR',
                'period': 'Every Month',
                'description': 'Full Executive Analytics, Audit PDF Reports, Realtime Push & Multi-Admin Access',
                'is_active': True,
            }
        )
    except Exception as e:
        logger.warning(f"Error seeding default subscription plans: {str(e)}")


class CreateStoreSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        store_id = request.data.get('store_id')
        plan_name = request.data.get('plan_name', SubscriptionPlan.PLAN_PREMIUM).upper()

        store = get_object_or_404(Store, pk=store_id)
        if store.owner != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        ensure_default_plans_exist()

        # Query dynamic SubscriptionPlan model from Database
        db_plan = SubscriptionPlan.objects.filter(name=plan_name, is_active=True).first()
        if db_plan:
            plan_id = db_plan.plan_id
            plan_amount = float(db_plan.amount)
        else:
            plan_id = 'plan_TBsfoswSWV4H7Q' if plan_name == SubscriptionPlan.PLAN_PREMIUM else 'plan_TBseXQU7BYzIG5'
            plan_amount = 2000.00 if plan_name == SubscriptionPlan.PLAN_PREMIUM else 0.00

        try:
            client = get_razorpay_client()
            sub_payload = {
                'plan_id': plan_id,
                'total_count': 12,
                'quantity': 1,
                'customer_notify': 1,
                'notes': {
                    'store_id': str(store.id),
                    'store_name': store.name,
                    'owner_email': request.user.email,
                    'plan_name': plan_name,
                }
            }

            logger.info(f"Creating Razorpay subscription for store {store.name} with plan_id {plan_id}")
            razorpay_sub = client.subscription.create(sub_payload)

            subscription, _ = StoreSubscription.objects.get_or_create(store=store)
            subscription.plan_name = plan_name
            subscription.plan = db_plan
            subscription.razorpay_plan_id = plan_id
            subscription.razorpay_subscription_id = razorpay_sub.get('id')
            subscription.status = razorpay_sub.get('status', StoreSubscription.STATUS_CREATED)
            subscription.short_url = razorpay_sub.get('short_url')
            subscription.total_count = razorpay_sub.get('total_count', 12)
            subscription.paid_count = razorpay_sub.get('paid_count', 0)
            subscription.save()

            key_id = os.getenv('RAZORPAY_KEY_ID', getattr(settings, 'RAZORPAY_KEY_ID', ''))

            return Response({
                'success': True,
                'subscription_id': razorpay_sub.get('id'),
                'key_id': key_id,
                'plan_name': plan_name,
                'plan_id': plan_id,
                'short_url': razorpay_sub.get('short_url'),
                'amount': plan_amount,
            })
        except Exception as e:
            logger.error(f"Error creating Razorpay subscription: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f"Razorpay API error: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class VerifyStoreSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_subscription_id = request.data.get('razorpay_subscription_id')
        razorpay_signature = request.data.get('razorpay_signature')
        store_id = request.data.get('store_id')

        store = get_object_or_404(Store, pk=store_id)
        if store.owner != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        subscription = get_object_or_404(StoreSubscription, store=store, razorpay_subscription_id=razorpay_subscription_id)

        try:
            client = get_razorpay_client()
            # Verify cryptographic signature
            verify_params = {
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_subscription_id': razorpay_subscription_id,
                'razorpay_signature': razorpay_signature,
            }
            client.utility.verify_subscription_payment_signature(verify_params)

            # Activate subscription in DB
            now = timezone.now()
            subscription.status = StoreSubscription.STATUS_ACTIVE
            subscription.current_start = now
            subscription.current_end = now + timedelta(days=30)
            subscription.paid_count += 1
            subscription.save()

            # Record payment history entry
            amount_val = 2000.00 if subscription.plan_name == StoreSubscription.PLAN_PREMIUM else 0.00
            if subscription.plan:
                amount_val = float(subscription.plan.amount)

            SubscriptionPaymentHistory.objects.get_or_create(
                razorpay_payment_id=razorpay_payment_id,
                defaults={
                    'subscription': subscription,
                    'razorpay_signature': razorpay_signature,
                    'amount': amount_val,
                    'status': 'captured',
                    'payment_method': 'razorpay_recurring',
                }
            )

            return Response({
                'success': True,
                'message': 'Subscription payment verified and store upgraded successfully!',
                'status': subscription.status,
                'plan_name': subscription.plan_name,
            })
        except razorpay.errors.SignatureVerificationError:
            logger.error("Razorpay subscription signature verification failed!")
            return Response({
                'success': False,
                'message': 'Invalid signature verification failed!'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Subscription verification error: {str(e)}")
            return Response({
                'success': False,
                'message': f"Verification error: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class GetStoreSubscriptionStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        store_id = request.query_params.get('store_id')
        store = get_object_or_404(Store, pk=store_id)
        if store.owner != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        ensure_default_plans_exist()

        subscription, created = StoreSubscription.objects.get_or_create(
            store=store,
            defaults={
                'plan_name': StoreSubscription.PLAN_PREMIUM,
                'status': StoreSubscription.STATUS_ACTIVE,
                'current_start': timezone.now(),
                'current_end': timezone.now() + timedelta(days=3650),
            }
        )

        # Ensure store gets Premium plan by default
        if created or subscription.plan_name == StoreSubscription.PLAN_BASIC:
            subscription.plan_name = StoreSubscription.PLAN_PREMIUM
            subscription.status = StoreSubscription.STATUS_ACTIVE
            if not subscription.current_start:
                subscription.current_start = timezone.now()
            if not subscription.current_end:
                subscription.current_end = timezone.now() + timedelta(days=3650)
            subscription.save()
        payments = subscription.payments.all()[:20]

        payments_list = [
            {
                'id': p.id,
                'payment_id': p.razorpay_payment_id,
                'amount': float(p.amount),
                'currency': p.currency,
                'status': p.status,
                'created_at': p.created_at,
            }
            for p in payments
        ]

        key_id = os.getenv('RAZORPAY_KEY_ID', getattr(settings, 'RAZORPAY_KEY_ID', ''))

        # Fetch active plans from SubscriptionPlan DB table
        db_plans = SubscriptionPlan.objects.filter(is_active=True)
        plans_data = [
            {
                'id': p.plan_id,
                'name': p.name,
                'price': float(p.amount),
                'currency': p.currency,
                'period': p.period,
                'description': p.description,
            }
            for p in db_plans
        ]

        return Response({
            'success': True,
            'plan_name': subscription.plan_name,
            'status': subscription.status,
            'razorpay_subscription_id': subscription.razorpay_subscription_id,
            'short_url': subscription.short_url,
            'current_start': subscription.current_start,
            'current_end': subscription.current_end,
            'paid_count': subscription.paid_count,
            'key_id': key_id,
            'payments': payments_list,
            'plans': plans_data,
        })


class CancelStoreSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        store_id = request.data.get('store_id')
        store = get_object_or_404(Store, pk=store_id)
        if store.owner != request.user:
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        subscription = get_object_or_404(StoreSubscription, store=store)

        if subscription.razorpay_subscription_id:
            try:
                client = get_razorpay_client()
                client.subscription.cancel(subscription.razorpay_subscription_id, {'cancel_at_cycle_end': 0})
            except Exception as e:
                logger.warning(f"Razorpay subscription cancellation API warning: {str(e)}")

        subscription.status = StoreSubscription.STATUS_CANCELLED
        subscription.ended_at = timezone.now()
        subscription.save()

        return Response({
            'success': True,
            'message': 'Subscription cancelled successfully.',
            'status': subscription.status,
        })


@method_decorator(csrf_exempt, name='dispatch')
class RazorpaySubscriptionWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'webhook'

    def post(self, request):
        raw_body = request.body.decode('utf-8')
        received_sig = request.headers.get('X-Razorpay-Signature') or request.META.get('HTTP_X_RAZORPAY_SIGNATURE')

        webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET', getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', ''))
        emergency_secret = os.getenv('EMERGENCY_RAZORPAY_WEBHOOK_SECRET', getattr(settings, 'EMERGENCY_RAZORPAY_WEBHOOK_SECRET', ''))

        # Verify HMAC SHA256 Signature against primary and emergency secret keys
        is_valid = False
        for secret in [webhook_secret, emergency_secret]:
            if secret:
                computed_sig = hmac.new(secret.encode('utf-8'), raw_body.encode('utf-8'), hashlib.sha256).hexdigest()
                if hmac.compare_digest(computed_sig, received_sig or ''):
                    is_valid = True
                    break

        if not webhook_secret and not emergency_secret:
            logger.critical('Razorpay webhook rejected: no webhook secret configured.')
            return Response({'status': 'webhook unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not is_valid:
            logger.error("Razorpay Webhook signature validation failed!")
            return Response({'status': 'invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_data = json.loads(raw_body)
            event_name = event_data.get('event')
            payload = event_data.get('payload', {})

            logger.info(f"Received Razorpay Webhook Event: {event_name}")

            sub_entity = payload.get('subscription', {}).get('entity', {})
            sub_id = sub_entity.get('id')

            if sub_id:
                subscription = StoreSubscription.objects.filter(razorpay_subscription_id=sub_id).first()
                if subscription:
                    if event_name in ['subscription.authenticated', 'subscription.activated']:
                        subscription.status = StoreSubscription.STATUS_ACTIVE
                        if not subscription.current_start:
                            subscription.current_start = timezone.now()
                            subscription.current_end = timezone.now() + timedelta(days=30)
                        subscription.save()

                    elif event_name == 'subscription.charged':
                        subscription.status = StoreSubscription.STATUS_ACTIVE
                        subscription.paid_count = sub_entity.get('paid_count', subscription.paid_count + 1)
                        subscription.current_start = timezone.now()
                        subscription.current_end = timezone.now() + timedelta(days=30)
                        subscription.save()

                        # Payment Entity details
                        payment_entity = payload.get('payment', {}).get('entity', {})
                        payment_id = payment_entity.get('id')
                        amount_inr = float(payment_entity.get('amount', 0)) / 100.0

                        if payment_id:
                            SubscriptionPaymentHistory.objects.get_or_create(
                                razorpay_payment_id=payment_id,
                                defaults={
                                    'subscription': subscription,
                                    'amount': amount_inr,
                                    'status': payment_entity.get('status', 'captured'),
                                    'payment_method': payment_entity.get('method', 'razorpay'),
                                }
                            )

                    elif event_name == 'subscription.halted':
                        subscription.status = StoreSubscription.STATUS_HALTED
                        subscription.save()

                    elif event_name in ['subscription.cancelled', 'subscription.completed', 'subscription.expired']:
                        subscription.status = StoreSubscription.STATUS_CANCELLED
                        subscription.ended_at = timezone.now()
                        subscription.save()

            return Response({'status': 'ok'})
        except Exception as e:
            logger.error(f"Error handling Razorpay Webhook: {str(e)}", exc_info=True)
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
