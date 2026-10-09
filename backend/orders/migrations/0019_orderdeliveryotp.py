from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('orders', '0018_orderissueevidence')]
    operations = [
        migrations.CreateModel(
            name='OrderDeliveryOTP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('otp_hash', models.CharField(max_length=255)),
                ('expires_at', models.DateTimeField()),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('send_count', models.PositiveSmallIntegerField(default=1)),
                ('is_verified', models.BooleanField(default=False)),
                ('last_sent_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_otp', to='orders.whatsapporder')),
            ],
        ),
    ]
