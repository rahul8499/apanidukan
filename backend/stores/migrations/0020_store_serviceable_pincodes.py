from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('stores', '0019_garments_only_business_type')]

    operations = [
        migrations.AddField(
            model_name='store',
            name='serviceable_pincodes',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
