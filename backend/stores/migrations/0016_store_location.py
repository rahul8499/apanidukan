from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stores', '0015_store_enable_online_payments_store_razorpay_key_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='store',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='store',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]