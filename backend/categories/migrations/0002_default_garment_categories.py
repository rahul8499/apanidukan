from django.db import migrations
from django.utils.text import slugify


GARMENT_CATEGORY_ALIASES = (
    ('Men - Shirts, T-Shirts & Topwear', 'पुरुष - शर्ट, टी-शर्ट एवं टॉपवियर', 'पुरुष - शर्ट, टी-शर्ट व टॉपवेअर'),
    ('Men - Jeans, Trousers & Bottomwear', 'पुरुष - जींस, ट्राउजर एवं बॉटमवियर', 'पुरुष - जीन्स, ट्राउझर्स व बॉटमवेअर'),
    ('Women - Sarees & Ethnic Wear', 'महिलाएं - साड़ी एवं एथनिक वियर', 'महिला - साड्या व पारंपरिक पोशाख'),
    ('Women - Kurtis, Dresses & Western Wear', 'महिलाएं - कुर्ती, ड्रेस एवं वेस्टर्न वियर', 'महिला - कुर्ती, ड्रेस व वेस्टर्न वेअर'),
    ('Kids & Baby Clothing', 'बच्चों एवं शिशुओं के कपड़े', 'लहान मुले व बाळांचे कपडे'),
    ('Innerwear, Loungewear & Nightwear', 'इनरवियर, लाउंजवियर एवं नाइटवियर', 'इनरवेअर, लाउंजवेअर व नाइटवेअर'),
    ('Footwear', 'फुटवियर', 'फुटवेअर'),
    ('Fashion Accessories', 'फैशन एक्सेसरीज़', 'फॅशन ॲक्सेसरीज'),
    ('Winter & Seasonal Wear', 'विंटर एवं सीज़नल वियर', 'हिवाळी व हंगामी कपडे'),
)


def create_missing_garment_categories(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Category = apps.get_model('categories', 'Category')
    database = schema_editor.connection.alias

    for store in Store.objects.using(database).filter(business_type='GARMENTS').iterator():
        existing_names = {
            str(name).strip().casefold()
            for name in Category.objects.using(database).filter(store_id=store.id).values_list('name', flat=True)
        }
        existing_slugs = set(
            Category.objects.using(database).filter(store_id=store.id).values_list('slug', flat=True)
        )
        for aliases in GARMENT_CATEGORY_ALIASES:
            if any(alias.casefold() in existing_names for alias in aliases):
                continue

            name = aliases[0]
            base_slug = slugify(name)[:240] or 'category'
            slug = base_slug
            suffix = 2
            while slug in existing_slugs:
                slug = f'{base_slug[:240 - len(str(suffix)) - 1]}-{suffix}'
                suffix += 1
            Category.objects.using(database).create(store_id=store.id, name=name, slug=slug)
            existing_slugs.add(slug)
            existing_names.add(name.casefold())


def preserve_categories(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('categories', '0001_initial'),
        ('stores', '0022_deliveryagent'),
    ]

    operations = [
        migrations.RunPython(create_missing_garment_categories, preserve_categories),
    ]
