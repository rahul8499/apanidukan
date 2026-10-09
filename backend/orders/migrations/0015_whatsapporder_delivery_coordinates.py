from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0014_orderitem_selected_size'),
    ]

    operations = [
        migrations.AddField(
            model_name='whatsapporder',
            name='delivery_latitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name='whatsapporder',
            name='delivery_longitude',
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]
