from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0009_alter_product_created_at_alter_product_is_published_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='available_sizes',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
