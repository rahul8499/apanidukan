from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('stores', '0016_store_location'),
    ]

    operations = [
        # Per-store gateway credentials are disabled. Removing the column is
        # safer than retaining unused plaintext secrets. The platform-level
        # Razorpay secret remains server-only in environment configuration.
        migrations.RemoveField(
            model_name='store',
            name='razorpay_key_secret',
        ),
    ]
