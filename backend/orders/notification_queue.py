from datetime import timedelta
from django.db import models, transaction
from django.utils import timezone
from .models import OutboundNotification
from .whatsapp_alerts import format_order_invoice_text, format_seller_alert_text, send_whatsapp_message


RETRY_MINUTES = (1, 5, 15, 60, 240)


def enqueue_order_notifications(order):
    jobs = []
    if order.customer_phone:
        jobs.append((order.customer_phone, 'ORDER_CREATED_CUSTOMER', format_order_invoice_text(order)))
    seller_phone = order.store.phone_number or getattr(order.store.owner, 'phone_number', '')
    if seller_phone:
        jobs.append((seller_phone, 'ORDER_CREATED_SELLER', format_seller_alert_text(order)))
    created = []
    for recipient, event_key, message in jobs:
        job, _ = OutboundNotification.objects.get_or_create(
            order=order, event_key=event_key, recipient=recipient,
            defaults={'message': message, 'next_attempt_at': timezone.now()},
        )
        created.append(job)
    return created


def process_notification(job_id):
    with transaction.atomic():
        job = OutboundNotification.objects.select_for_update().get(id=job_id)
        if job.status == OutboundNotification.STATUS_SENT or job.attempts >= job.max_attempts:
            return job
        job.attempts += 1
        try:
            sent = send_whatsapp_message(job.recipient, job.message)
            error = '' if sent else 'Provider did not accept the message.'
        except Exception as exc:
            sent, error = False, f'{type(exc).__name__}: {exc}'[:1000]
        if sent:
            job.status = OutboundNotification.STATUS_SENT
            job.sent_at = timezone.now()
            job.last_error = ''
        else:
            job.last_error = error
            if job.attempts >= job.max_attempts:
                job.status = OutboundNotification.STATUS_FAILED
            else:
                delay = RETRY_MINUTES[min(job.attempts - 1, len(RETRY_MINUTES) - 1)]
                job.status = OutboundNotification.STATUS_PENDING
                job.next_attempt_at = timezone.now() + timedelta(minutes=delay)
        job.save()
        return job


def process_due_notifications(limit=100):
    ids = list(OutboundNotification.objects.filter(
        status=OutboundNotification.STATUS_PENDING,
        next_attempt_at__lte=timezone.now(), attempts__lt=models.F('max_attempts'),
    ).order_by('next_attempt_at').values_list('id', flat=True)[:limit])
    return [process_notification(job_id) for job_id in ids]
