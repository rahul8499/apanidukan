from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('orders', '0015_whatsapporder_delivery_coordinates')]

    operations = [
        migrations.AddField(
            model_name='whatsapporder',
            name='customer_note',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='whatsapporder',
            name='status',
            field=models.CharField(
                choices=[
                    ('NEW', 'Placed'), ('CONFIRMED', 'Confirmed'), ('PACKED', 'Packed'),
                    ('READY_FOR_PICKUP', 'Ready for Pickup'), ('OUT_FOR_DELIVERY', 'Out for Delivery'),
                    ('PAID', 'Paid'), ('DELIVERED', 'Delivered'), ('CANCELLED', 'Cancelled'),
                ],
                db_index=True, default='NEW', max_length=30,
            ),
        ),
    ]
