from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0002_phoneotp_user_phone_number')]

    operations = [
        migrations.AddField(
            model_name='phoneotp',
            name='provider_request_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
