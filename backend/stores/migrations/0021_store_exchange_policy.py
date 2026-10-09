from django.db import migrations, models


def default_reasons(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.filter(exchange_allowed_reasons=[]).update(exchange_allowed_reasons=[
        'Size does not fit', 'Wrong item received', 'Damaged or defective item', 'Colour differs from listing'
    ])


class Migration(migrations.Migration):
    dependencies = [('stores', '0020_store_serviceable_pincodes')]
    operations = [
        migrations.AddField(model_name='store', name='exchange_enabled', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='store', name='exchange_window_days', field=models.PositiveSmallIntegerField(default=7)),
        migrations.AddField(model_name='store', name='exchange_evidence_required', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='store', name='exchange_allowed_reasons', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='store', name='exchange_policy', field=models.TextField(blank=True, default='Item must be unused, unwashed and have original tags attached.')),
        migrations.RunPython(default_reasons, migrations.RunPython.noop),
    ]
