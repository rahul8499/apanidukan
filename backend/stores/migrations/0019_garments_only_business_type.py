from django.db import migrations, models


def set_all_stores_to_garments(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.exclude(business_type='GARMENTS').update(business_type='GARMENTS')


class Migration(migrations.Migration):
    dependencies = [
        ('stores', '0018_alter_store_business_type_alter_store_is_published_and_more'),
    ]

    operations = [
        migrations.RunPython(set_all_stores_to_garments, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='store',
            name='business_type',
            field=models.CharField(
                choices=[('GARMENTS', 'Clothing & Garments / कपडे व फॅशन')],
                db_index=True,
                default='GARMENTS',
                max_length=50,
            ),
        ),
    ]
