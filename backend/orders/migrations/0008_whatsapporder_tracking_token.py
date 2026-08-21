import uuid
from django.db import migrations, models


def assign_tracking_tokens(apps, schema_editor):
    WhatsAppOrder = apps.get_model('orders', 'WhatsAppOrder')
    for order in WhatsAppOrder.objects.filter(tracking_token__isnull=True).iterator():
        order.tracking_token = uuid.uuid4()
        order.save(update_fields=['tracking_token'])


class Migration(migrations.Migration):
    dependencies = [('orders', '0007_whatsapporder_wallet_cashback_earned_and_more')]

    operations = [
        migrations.AddField(
            model_name='whatsapporder',
            name='tracking_token',
            field=models.UUIDField(blank=True, editable=False, null=True),
        ),
        migrations.RunPython(assign_tracking_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='whatsapporder',
            name='tracking_token',
            field=models.UUIDField(blank=True, default=uuid.uuid4, editable=False, null=True, unique=True),
        ),
    ]
