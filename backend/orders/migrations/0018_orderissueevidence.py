from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('orders', '0017_orderissuerequest_orderstatusevent')]
    operations = [
        migrations.CreateModel(
            name='OrderIssueEvidence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='orders/exchange-evidence/%Y/%m/')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('issue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='evidence', to='orders.orderissuerequest')),
            ],
        ),
    ]
