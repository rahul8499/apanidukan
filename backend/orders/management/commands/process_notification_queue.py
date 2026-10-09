from django.core.management.base import BaseCommand
from orders.notification_queue import process_due_notifications


class Command(BaseCommand):
    help = 'Send due WhatsApp/SMS outbox jobs and schedule failed attempts for retry.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100)

    def handle(self, *args, **options):
        jobs = process_due_notifications(max(1, min(options['limit'], 1000)))
        sent = sum(job.status == 'SENT' for job in jobs)
        self.stdout.write(self.style.SUCCESS(f'Processed {len(jobs)} jobs; {sent} sent.'))
