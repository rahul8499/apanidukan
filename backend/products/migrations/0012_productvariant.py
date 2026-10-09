from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def create_variants(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductVariant = apps.get_model('products', 'ProductVariant')
    for product in Product.objects.exclude(available_sizes=[]).iterator():
        for size in product.available_sizes or []:
            ProductVariant.objects.get_or_create(
                product=product,
                size=size,
                color='',
                defaults={
                    'sku': f'{product.id}-{size}'.replace(' ', '-').upper(),
                    'stock_quantity': max(0, int((product.size_stock or {}).get(size, 0))),
                    'is_active': True,
                },
            )


class Migration(migrations.Migration):
    dependencies = [('products', '0011_product_size_stock')]

    operations = [
        migrations.CreateModel(
            name='ProductVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('size', models.CharField(blank=True, default='', max_length=30)),
                ('color', models.CharField(blank=True, default='', max_length=50)),
                ('sku', models.CharField(blank=True, db_index=True, default='', max_length=100)),
                ('stock_quantity', models.PositiveIntegerField(default=0)),
                ('price_override', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='products.product')),
            ],
        ),
        migrations.AddConstraint(
            model_name='productvariant',
            constraint=models.UniqueConstraint(fields=('product', 'size', 'color'), name='unique_product_size_color'),
        ),
        migrations.AddIndex(
            model_name='productvariant',
            index=models.Index(fields=['product', 'is_active'], name='products_pr_product_66459e_idx'),
        ),
        migrations.RunPython(create_variants, migrations.RunPython.noop),
    ]
