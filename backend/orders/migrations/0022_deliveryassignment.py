from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone

class Migration(migrations.Migration):
    dependencies = [('orders','0021_exchange_completion_otp_notification_outbox'), ('stores','0022_deliveryagent'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name='DeliveryAssignment', fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('status', models.CharField(choices=[('ASSIGNED','Assigned'),('ACCEPTED','Accepted'),('PICKED_UP','Picked Up'),('OUT_FOR_DELIVERY','Out For Delivery'),('DELIVERED','Delivered'),('FAILED','Failed')], db_index=True, default='ASSIGNED', max_length=30)),
        ('seller_instruction', models.TextField(blank=True, default='')), ('failure_reason', models.TextField(blank=True, default='')),
        ('assigned_at', models.DateTimeField(default=django.utils.timezone.now)), ('accepted_at', models.DateTimeField(blank=True, null=True)),
        ('picked_up_at', models.DateTimeField(blank=True, null=True)), ('completed_at', models.DateTimeField(blank=True, null=True)), ('updated_at', models.DateTimeField(auto_now=True)),
        ('agent', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='assignments', to='stores.deliveryagent')),
        ('assigned_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='delivery_assignments_created', to=settings.AUTH_USER_MODEL)),
        ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_assignment', to='orders.whatsapporder')),
    ])]
