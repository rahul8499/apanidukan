from django.db import migrations, models


def populate_size_stock(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    for product in Product.objects.exclude(available_sizes=[]).iterator():
        sizes = [str(size).strip().upper() for size in (product.available_sizes or []) if str(size).strip()]
        if not sizes:
            continue
        base, remainder = divmod(max(0, product.stock_quantity), len(sizes))
        product.size_stock = {
            size: base + (1 if index < remainder else 0)
            for index, size in enumerate(sizes)
        }
        product.save(update_fields=['size_stock'])


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0010_product_available_sizes'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='size_stock',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(populate_size_stock, migrations.RunPython.noop),
    ]
