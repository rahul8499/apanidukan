from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('orders', '0019_orderdeliveryotp')]
    operations = [
        migrations.AddField(model_name='whatsapporder', name='expected_dispatch_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='whatsapporder', name='delivery_agent_name', field=models.CharField(blank=True, default='', max_length=120)),
        migrations.AddField(model_name='whatsapporder', name='delivery_agent_phone', field=models.CharField(blank=True, default='', max_length=40)),
        migrations.AddField(model_name='whatsapporder', name='delivery_proof', field=models.ImageField(blank=True, null=True, upload_to='orders/delivery-proof/%Y/%m/')),
        migrations.AddField(model_name='whatsapporder', name='delivered_at', field=models.DateTimeField(blank=True, null=True)),
    ]
