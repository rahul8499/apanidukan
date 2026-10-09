from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0013_order_idempotency_key_whatsapporder_idempotency_key'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='selected_size',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
    ]
