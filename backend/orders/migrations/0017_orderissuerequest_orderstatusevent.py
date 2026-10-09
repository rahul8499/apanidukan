from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal


class Migration(migrations.Migration):
    dependencies = [('orders', '0016_whatsapporder_fulfillment_statuses')]

    operations = [
        migrations.CreateModel(
            name='OrderIssueRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('request_type', models.CharField(choices=[('REFUND', 'Refund'), ('RETURN', 'Return'), ('EXCHANGE', 'Exchange')], max_length=20)),
                ('status', models.CharField(choices=[('REQUESTED', 'Requested'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('PROCESSING', 'Processing'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed')], db_index=True, default='REQUESTED', max_length=20)),
                ('product_id', models.PositiveBigIntegerField(blank=True, null=True)),
                ('selected_size', models.CharField(blank=True, default='', max_length=30)),
                ('requested_size', models.CharField(blank=True, default='', max_length=30)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('reason', models.TextField()),
                ('customer_phone', models.CharField(db_index=True, max_length=40)),
                ('seller_note', models.TextField(blank=True, default='')),
                ('refund_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('provider_refund_id', models.CharField(blank=True, default='', max_length=150)),
                ('created_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='issue_requests', to='orders.whatsapporder')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='OrderStatusEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_status', models.CharField(blank=True, default='', max_length=30)),
                ('to_status', models.CharField(max_length=30)),
                ('actor_type', models.CharField(default='SYSTEM', max_length=20)),
                ('actor_id', models.CharField(blank=True, default='', max_length=100)),
                ('note', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_events', to='orders.whatsapporder')),
            ],
        ),
    ]
