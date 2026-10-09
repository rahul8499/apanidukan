from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('orders', '0020_whatsapporder_fulfillment_proof')]
    operations = [
        migrations.AddField(model_name='orderissuerequest', name='completion_proof', field=models.ImageField(blank=True, null=True, upload_to='orders/exchange-completion/%Y/%m/')),
        migrations.AddField(model_name='orderissuerequest', name='completed_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.CreateModel(name='OrderIssueCompletionOTP', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('otp_hash', models.CharField(max_length=255)), ('expires_at', models.DateTimeField()),
            ('attempts', models.PositiveSmallIntegerField(default=0)), ('send_count', models.PositiveSmallIntegerField(default=1)),
            ('is_verified', models.BooleanField(default=False)), ('last_sent_at', models.DateTimeField(default=django.utils.timezone.now)),
            ('verified_at', models.DateTimeField(blank=True, null=True)), ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
            ('issue', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='completion_otp', to='orders.orderissuerequest')),
        ]),
        migrations.CreateModel(name='OutboundNotification', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('channel', models.CharField(default='WHATSAPP', max_length=20)), ('recipient', models.CharField(db_index=True, max_length=40)),
            ('message', models.TextField()), ('event_key', models.CharField(db_index=True, max_length=100)),
            ('status', models.CharField(choices=[('PENDING','Pending'),('SENT','Sent'),('FAILED','Failed')], db_index=True, default='PENDING', max_length=20)),
            ('attempts', models.PositiveSmallIntegerField(default=0)), ('max_attempts', models.PositiveSmallIntegerField(default=5)),
            ('next_attempt_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)), ('last_error', models.TextField(blank=True, default='')),
            ('sent_at', models.DateTimeField(blank=True, null=True)), ('created_at', models.DateTimeField(default=django.utils.timezone.now)), ('updated_at', models.DateTimeField(auto_now=True)),
            ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='outbound_notifications', to='orders.whatsapporder')),
        ], options={'constraints': [models.UniqueConstraint(fields=('order','event_key','recipient'), name='unique_order_notification_event')]}),
    ]
