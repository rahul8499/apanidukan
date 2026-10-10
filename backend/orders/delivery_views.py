import secrets
import string
import hmac
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from config.websocket import broadcast_order_event_sync

from accounts.services import normalize_phone, send_msg91_otp
from stores.models import DeliveryAgent, Store
from .models import DeliveryAssignment, OrderCancellationOTP, OrderDeliveryOTP, OrderStatusEvent, WhatsAppOrder
from .serializers import WhatsAppOrderSerializer


def _temporary_password():
    alphabet = string.ascii_letters + string.digits + '@#%'
    return ''.join(secrets.choice(alphabet) for _ in range(12))


def _agent_data(agent):
    return {
        'id': agent.id, 'agent_code': agent.agent_code, 'full_name': agent.full_name,
        'phone_number': agent.phone_number, 'vehicle_type': agent.vehicle_type,
        'vehicle_number': agent.vehicle_number, 'serviceable_pincodes': agent.serviceable_pincodes,
        'email': agent.user.email, 'is_active': agent.is_active, 'must_change_password': agent.must_change_password,
    }


def _seller_store(request, store_id):
    qs = Store.objects.all() if request.user.is_staff else Store.objects.filter(owner=request.user)
    return get_object_or_404(qs, id=store_id)


class SellerDeliveryAgentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, store_id):
        store = _seller_store(request, store_id)
        return Response([_agent_data(a) for a in store.delivery_agents.order_by('-is_active', 'full_name')])

    @transaction.atomic
    def post(self, request, store_id):
        store = _seller_store(request, store_id)
        name = str(request.data.get('full_name', '')).strip()
        email = str(request.data.get('email', '')).strip().lower()
        phone = normalize_phone(request.data.get('phone_number', ''))
        if not name or '@' not in email or len(phone) != 10:
            return Response({'detail': 'Full name, valid email and 10-digit mobile number are required.'}, status=400)
        if store.delivery_agents.filter(phone_number=phone).exists():
            return Response({'detail': 'This mobile number is already registered in your delivery team.'}, status=400)
        if get_user_model().objects.filter(email__iexact=email).exists():
            return Response({'detail': 'This email is already used by another account.'}, status=400)
        code = f"{store.slug[:10].upper()}-{secrets.token_hex(3).upper()}"
        password = _temporary_password()
        User = get_user_model()
        user = User.objects.create_user(email=email, password=password, first_name=name)
        agent = DeliveryAgent.objects.create(
            store=store, user=user, agent_code=code, full_name=name, phone_number=phone,
            vehicle_type=str(request.data.get('vehicle_type', '')).strip()[:50],
            vehicle_number=str(request.data.get('vehicle_number', '')).strip().upper()[:40],
            serviceable_pincodes=request.data.get('serviceable_pincodes') or [],
        )
        return Response({**_agent_data(agent), 'temporary_password': password}, status=201)


class SellerDeliveryAgentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, store_id, agent_id):
        store = _seller_store(request, store_id)
        agent = get_object_or_404(DeliveryAgent, id=agent_id, store=store)
        for field in ('full_name', 'vehicle_type', 'vehicle_number'):
            if field in request.data:
                setattr(agent, field, str(request.data[field]).strip())
        if 'email' in request.data:
            email = str(request.data['email']).strip().lower()
            if '@' not in email or get_user_model().objects.exclude(id=agent.user_id).filter(email__iexact=email).exists():
                return Response({'detail': 'Enter a valid unused email address.'}, status=400)
            agent.user.email = email
            agent.user.save(update_fields=['email'])
        if 'is_active' in request.data:
            agent.is_active = bool(request.data['is_active'])
            agent.user.is_active = agent.is_active
            agent.user.save(update_fields=['is_active'])
        if 'serviceable_pincodes' in request.data:
            agent.serviceable_pincodes = request.data['serviceable_pincodes'] or []
        agent.save()
        return Response(_agent_data(agent))

    def post(self, request, store_id, agent_id):
        store = _seller_store(request, store_id)
        agent = get_object_or_404(DeliveryAgent, id=agent_id, store=store)
        password = _temporary_password()
        agent.user.set_password(password); agent.user.save(update_fields=['password'])
        agent.must_change_password = True; agent.save(update_fields=['must_change_password', 'updated_at'])
        return Response({**_agent_data(agent), 'temporary_password': password})


class SellerAssignDeliveryAgentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, store_id, order_id):
        store = _seller_store(request, store_id)
        order = get_object_or_404(WhatsAppOrder.objects.select_for_update(), id=order_id, store=store)
        if order.order_type != 'HOME_DELIVERY':
            return Response({'detail': 'Delivery agent can be assigned only to home-delivery orders.'}, status=400)
        if order.status in (WhatsAppOrder.STATUS_DELIVERED, WhatsAppOrder.STATUS_CANCELLED):
            return Response({'detail': 'Delivered or cancelled orders cannot be assigned.'}, status=400)
        agent = get_object_or_404(DeliveryAgent, id=request.data.get('agent_id'), store=store, is_active=True)
        assignment_status = (
            DeliveryAssignment.STATUS_OUT_FOR_DELIVERY
            if order.status == WhatsAppOrder.STATUS_OUT_FOR_DELIVERY
            else DeliveryAssignment.STATUS_ASSIGNED
        )
        assignment, _ = DeliveryAssignment.objects.update_or_create(
            order=order, defaults={'agent': agent, 'assigned_by': request.user, 'status': assignment_status,
                                   'seller_instruction': str(request.data.get('seller_instruction', '')).strip()}
        )
        order.delivery_agent_name = agent.full_name; order.delivery_agent_phone = agent.phone_number
        order.save(update_fields=['delivery_agent_name', 'delivery_agent_phone', 'updated_at'])
        order_data = WhatsAppOrderSerializer(order).data
        broadcast_order_event_sync(f'order_{order.reference}', {'type': 'order_status_updated', 'order': order_data})
        broadcast_order_event_sync(f'store_{store.id}', {'type': 'order_status_updated', 'order': order_data})
        return Response({'success': True, 'assignment': {'id': assignment.id, 'status': assignment.status, 'agent': _agent_data(agent)}})


class DeliveryChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        agent = getattr(request.user, 'delivery_agent_profile', None)
        if not agent or not agent.is_active:
            return Response({'detail': 'Delivery-agent account required.'}, status=403)
        current, new = str(request.data.get('current_password', '')), str(request.data.get('new_password', ''))
        if not request.user.check_password(current) or len(new) < 8:
            return Response({'detail': 'Current password is incorrect or new password is shorter than 8 characters.'}, status=400)
        request.user.set_password(new); request.user.save(update_fields=['password'])
        agent.must_change_password = False; agent.save(update_fields=['must_change_password', 'updated_at'])
        return Response({'success': True})


class DeliveryOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _agent(self, request):
        agent = getattr(request.user, 'delivery_agent_profile', None)
        return agent if agent and agent.is_active else None

    def get(self, request):
        agent = self._agent(request)
        if not agent: return Response({'detail': 'Delivery-agent account required.'}, status=403)
        rows = DeliveryAssignment.objects.filter(agent=agent).select_related('order').order_by('-assigned_at')
        return Response([{'assignment_id': row.id, 'assignment_status': row.status,
                          'seller_instruction': row.seller_instruction, 'order': WhatsAppOrderSerializer(row.order).data}
                         for row in rows])


class DeliveryOrderStatusView(DeliveryOrdersView):
    transitions = {
        DeliveryAssignment.STATUS_ASSIGNED: {DeliveryAssignment.STATUS_ACCEPTED},
        DeliveryAssignment.STATUS_ACCEPTED: {DeliveryAssignment.STATUS_PICKED_UP, DeliveryAssignment.STATUS_FAILED},
        DeliveryAssignment.STATUS_PICKED_UP: {DeliveryAssignment.STATUS_OUT_FOR_DELIVERY, DeliveryAssignment.STATUS_FAILED},
        DeliveryAssignment.STATUS_OUT_FOR_DELIVERY: {DeliveryAssignment.STATUS_FAILED},
    }

    @transaction.atomic
    def patch(self, request, order_id):
        agent = self._agent(request)
        if not agent: return Response({'detail': 'Delivery-agent account required.'}, status=403)
        row = get_object_or_404(DeliveryAssignment.objects.select_for_update().select_related('order'), order_id=order_id, agent=agent)
        new = str(request.data.get('status', '')).upper()
        if new not in self.transitions.get(row.status, set()):
            return Response({'detail': f'Invalid transition from {row.status} to {new}.'}, status=400)
        if new == DeliveryAssignment.STATUS_ACCEPTED and row.order.status not in (
            WhatsAppOrder.STATUS_PACKED, WhatsAppOrder.STATUS_PAID, WhatsAppOrder.STATUS_OUT_FOR_DELIVERY,
        ):
            return Response({'detail': 'Seller must mark the order Packed before the rider can accept it.'}, status=400)
        now = timezone.now(); row.status = new
        if new == row.STATUS_ACCEPTED: row.accepted_at = now
        if new == row.STATUS_PICKED_UP: row.picked_up_at = now
        if new == row.STATUS_FAILED:
            row.failure_reason = str(request.data.get('failure_reason', '')).strip()
            if not row.failure_reason: return Response({'detail': 'Failure reason is required.'}, status=400)
        row.save()
        if new == row.STATUS_OUT_FOR_DELIVERY:
            previous = row.order.status; row.order.status = WhatsAppOrder.STATUS_OUT_FOR_DELIVERY
            row.order.save(update_fields=['status', 'updated_at'])
            OrderStatusEvent.objects.create(order=row.order, from_status=previous, to_status=row.order.status,
                                            actor_type='DELIVERY_AGENT', actor_id=str(agent.id))
        order_data = WhatsAppOrderSerializer(row.order).data
        broadcast_order_event_sync(f'order_{row.order.reference}', {'type': 'order_status_updated', 'order': order_data})
        broadcast_order_event_sync(f'store_{row.order.store_id}', {'type': 'order_status_updated', 'order': order_data})
        return Response({'success': True, 'assignment_status': row.status, 'order': order_data})


class DeliveryOrderOTPView(DeliveryOrdersView):
    def post(self, request, order_id):
        agent = self._agent(request)
        row = get_object_or_404(DeliveryAssignment.objects.select_related('order'), order_id=order_id, agent=agent,
                                status=DeliveryAssignment.STATUS_OUT_FOR_DELIVERY)
        phone = normalize_phone(row.order.customer_phone)
        if len(phone) != 10: return Response({'detail': 'Customer mobile number is invalid.'}, status=400)
        existing = OrderDeliveryOTP.objects.filter(order=row.order).first(); now = timezone.now()
        if existing and existing.is_verified:
            return Response({'detail': 'Delivery OTP is already verified.'}, status=400)
        if existing and existing.last_sent_at > now - timedelta(seconds=60):
            return Response({'detail': 'Please wait before resending OTP.'}, status=429)
        if existing and existing.send_count >= 5 and existing.created_at > now - timedelta(hours=24):
            return Response({'detail': 'Maximum 5 delivery OTP sends reached for this order today.'}, status=429)
        code = f'{secrets.randbelow(900000) + 100000}'
        if not send_msg91_otp(phone, code): return Response({'detail': 'OTP could not be sent.'}, status=503)
        OrderDeliveryOTP.objects.update_or_create(order=row.order, defaults={'otp_hash': make_password(code),
            'expires_at': now + timedelta(minutes=10), 'attempts': 0, 'is_verified': False, 'verified_at': None,
            'last_sent_at': now, 'send_count': (existing.send_count + 1) if existing else 1})
        broadcast_order_event_sync(f'order_{row.order.reference}', {'type': 'delivery_otp_sent', 'order_reference': row.order.reference})
        return Response({'success': True, 'message': f'OTP sent to ******{phone[-4:]}.'})

    @transaction.atomic
    def patch(self, request, order_id):
        agent = self._agent(request)
        row = get_object_or_404(DeliveryAssignment.objects.select_for_update().select_related('order'), order_id=order_id,
                                agent=agent, status=DeliveryAssignment.STATUS_OUT_FOR_DELIVERY)
        code = str(request.data.get('otp', '')).strip(); proof = request.FILES.get('delivery_proof')
        otp = OrderDeliveryOTP.objects.select_for_update().filter(order=row.order).first()
        from .views import delivery_fallback_code
        valid_code = bool(otp and (
            check_password(code, otp.otp_hash) or hmac.compare_digest(code, delivery_fallback_code(row.order, otp))
        ))
        if not otp or otp.is_verified or otp.expires_at < timezone.now() or not valid_code:
            if otp and not otp.is_verified: otp.attempts += 1; otp.save(update_fields=['attempts'])
            return Response({'detail': 'OTP is incorrect or expired.'}, status=400)
        if not proof: return Response({'detail': 'Delivery proof photo is required.'}, status=400)
        if proof.size > 5 * 1024 * 1024 or proof.content_type not in ('image/jpeg', 'image/png', 'image/webp'):
            return Response({'detail': 'Proof must be JPG, PNG or WebP under 5 MB.'}, status=400)
        now = timezone.now(); otp.is_verified = True; otp.verified_at = now; otp.save(update_fields=['is_verified','verified_at'])
        previous = row.order.status; row.order.status = WhatsAppOrder.STATUS_DELIVERED; row.order.delivered_at = now
        row.order.delivery_proof = proof; row.order.save(update_fields=['status','delivered_at','delivery_proof','updated_at'])
        row.status = DeliveryAssignment.STATUS_DELIVERED; row.completed_at = now; row.save(update_fields=['status','completed_at','updated_at'])
        OrderStatusEvent.objects.create(order=row.order, from_status=previous, to_status=row.order.status,
                                        actor_type='DELIVERY_AGENT', actor_id=str(agent.id), note='Customer OTP and proof verified.')
        order_data = WhatsAppOrderSerializer(row.order).data
        broadcast_order_event_sync(f'order_{row.order.reference}', {'type': 'order_status_updated', 'order': order_data})
        broadcast_order_event_sync(f'store_{row.order.store_id}', {'type': 'order_status_updated', 'order': order_data})
        return Response({'success': True, 'order': order_data})


class DeliveryOrderCancellationOTPView(DeliveryOrdersView):
    def post(self, request, order_id):
        agent = self._agent(request)
        if not agent:
            return Response({'detail': 'Delivery-agent account required.'}, status=403)
        row = get_object_or_404(
            DeliveryAssignment.objects.select_related('order'), order_id=order_id, agent=agent
        )
        if row.status in (DeliveryAssignment.STATUS_DELIVERED, DeliveryAssignment.STATUS_FAILED, DeliveryAssignment.STATUS_CANCELLED) or row.order.status in (WhatsAppOrder.STATUS_DELIVERED, WhatsAppOrder.STATUS_CANCELLED):
            return Response({'detail': 'This delivery can no longer be cancelled.'}, status=400)
        phone = normalize_phone(row.order.customer_phone)
        if len(phone) != 10:
            return Response({'detail': 'Customer mobile number is invalid.'}, status=400)

        existing = OrderCancellationOTP.objects.filter(order=row.order).first()
        now = timezone.now()
        resend_requested = request.data.get('resend') is True
        if existing and existing.expires_at > now:
            if existing.attempts >= 5:
                return Response({'detail': 'Maximum OTP verification attempts reached for this order.'}, status=429)
            resend_at = existing.last_sent_at + timedelta(seconds=60)
            if not resend_requested:
                return Response({
                    'success': True,
                    'reused_existing': True,
                    'message': 'A cancellation OTP is already active. Check the customer phone for the current code.',
                    'expires_at': existing.expires_at.isoformat(),
                    'resend_at': resend_at.isoformat(),
                })
            if now < resend_at:
                retry_after = max(1, int((resend_at - now).total_seconds()))
                return Response({
                    'detail': 'Please wait before requesting another cancellation OTP.',
                    'retry_after_seconds': retry_after,
                }, status=429)
        elif existing and not resend_requested:
            return Response({
                'success': True,
                'reused_existing': True,
                'message': 'The previous cancellation OTP has expired. Request a new code to continue.',
                'expires_at': existing.expires_at.isoformat(),
                'resend_at': existing.last_sent_at.isoformat(),
            })
        if existing and existing.send_count >= 5 and existing.created_at > now - timedelta(hours=24):
            return Response({'detail': 'Maximum 5 cancellation OTP sends reached for this order today.'}, status=429)

        code = f'{secrets.randbelow(900000) + 100000}'
        if not send_msg91_otp(phone, code):
            return Response({'detail': 'Cancellation OTP could not be sent.'}, status=503)
        expires_at = now + timedelta(minutes=10)
        resend_at = now + timedelta(seconds=60)
        if existing:
            existing.otp_hash = make_password(code)
            existing.expires_at = expires_at
            existing.attempts = 0
            existing.last_sent_at = now
            existing.send_count += 1
            existing.save(update_fields=['otp_hash', 'expires_at', 'attempts', 'last_sent_at', 'send_count'])
        else:
            OrderCancellationOTP.objects.create(
                order=row.order, otp_hash=make_password(code), expires_at=expires_at,
                last_sent_at=now,
            )
        return Response({
            'success': True,
            'message': f'Cancellation OTP sent to ******{phone[-4:]}.',
            'expires_at': expires_at.isoformat(),
            'resend_at': resend_at.isoformat(),
        })

    @transaction.atomic
    def patch(self, request, order_id):
        agent = self._agent(request)
        if not agent:
            return Response({'detail': 'Delivery-agent account required.'}, status=403)
        row = get_object_or_404(
            DeliveryAssignment.objects.select_for_update().select_related('order'), order_id=order_id, agent=agent
        )
        if row.status in (DeliveryAssignment.STATUS_DELIVERED, DeliveryAssignment.STATUS_FAILED, DeliveryAssignment.STATUS_CANCELLED) or row.order.status in (WhatsAppOrder.STATUS_DELIVERED, WhatsAppOrder.STATUS_CANCELLED):
            return Response({'detail': 'This delivery can no longer be cancelled.'}, status=400)
        otp = OrderCancellationOTP.objects.select_for_update().filter(order=row.order).first()
        if not otp:
            return Response({'detail': 'Request a cancellation OTP first.'}, status=400)
        if otp.attempts >= 5:
            return Response({'detail': 'Maximum OTP verification attempts reached for this order.'}, status=429)
        if otp.expires_at <= timezone.now():
            return Response({'detail': 'Cancellation OTP has expired. Request a new one.'}, status=400)
        code = str(request.data.get('otp', '')).strip()
        if len(code) != 6 or not code.isdigit() or not check_password(code, otp.otp_hash):
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            return Response({'detail': 'Cancellation OTP is incorrect.'}, status=400)
        reason = str(request.data.get('reason', '')).strip()
        if len(reason) < 5:
            return Response({'detail': 'Enter a cancellation reason of at least 5 characters.'}, status=400)

        from .views import cancel_whatsapp_order
        cancel_whatsapp_order(row.order, cancelled_by='DELIVERY_AGENT', reason=reason, actor_id=agent.id)
        row.status = DeliveryAssignment.STATUS_CANCELLED
        row.save(update_fields=['status', 'updated_at'])
        order_data = WhatsAppOrderSerializer(row.order).data
        event = {'type': 'order_status_updated', 'order': order_data}
        broadcast_order_event_sync(f'order_{row.order.reference}', event)
        broadcast_order_event_sync(f'store_{row.order.store_id}', event)
        return Response({'success': True, 'order': order_data})
