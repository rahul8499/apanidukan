from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone

class Migration(migrations.Migration):
    dependencies = [('stores','0021_store_exchange_policy'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name='DeliveryAgent', fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('agent_code', models.CharField(db_index=True, max_length=30, unique=True)), ('full_name', models.CharField(max_length=150)),
        ('phone_number', models.CharField(db_index=True, max_length=20)), ('vehicle_type', models.CharField(blank=True, default='', max_length=50)),
        ('vehicle_number', models.CharField(blank=True, default='', max_length=40)), ('serviceable_pincodes', models.JSONField(blank=True, default=list)),
        ('is_active', models.BooleanField(db_index=True, default=True)), ('must_change_password', models.BooleanField(default=True)),
        ('created_at', models.DateTimeField(default=django.utils.timezone.now)), ('updated_at', models.DateTimeField(auto_now=True)),
        ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_agents', to='stores.store')),
        ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_agent_profile', to=settings.AUTH_USER_MODEL)),
    ], options={'constraints':[models.UniqueConstraint(fields=('store','phone_number'), name='unique_delivery_agent_phone_per_store')]})]
