from django.utils.text import slugify

from .models import Category


GARMENT_DEFAULT_CATEGORY_ALIASES = (
    (
        'Men - Shirts, T-Shirts & Topwear',
        'पुरुष - शर्ट, टी-शर्ट एवं टॉपवियर',
        'पुरुष - शर्ट, टी-शर्ट व टॉपवेअर',
    ),
    (
        'Men - Jeans, Trousers & Bottomwear',
        'पुरुष - जींस, ट्राउजर एवं बॉटमवियर',
        'पुरुष - जीन्स, ट्राउझर्स व बॉटमवेअर',
    ),
    (
        'Women - Sarees & Ethnic Wear',
        'महिलाएं - साड़ी एवं एथनिक वियर',
        'महिला - साड्या व पारंपरिक पोशाख',
    ),
    (
        'Women - Kurtis, Dresses & Western Wear',
        'महिलाएं - कुर्ती, ड्रेस एवं वेस्टर्न वियर',
        'महिला - कुर्ती, ड्रेस व वेस्टर्न वेअर',
    ),
    (
        'Kids & Baby Clothing',
        'बच्चों एवं शिशुओं के कपड़े',
        'लहान मुले व बाळांचे कपडे',
    ),
    (
        'Innerwear, Loungewear & Nightwear',
        'इनरवियर, लाउंजवियर एवं नाइटवियर',
        'इनरवेअर, लाउंजवेअर व नाइटवेअर',
    ),
    (
        'Footwear',
        'फुटवियर',
        'फुटवेअर',
    ),
    (
        'Fashion Accessories',
        'फैशन एक्सेसरीज़',
        'फॅशन ॲक्सेसरीज',
    ),
    (
        'Winter & Seasonal Wear',
        'विंटर एवं सीज़नल वियर',
        'हिवाळी व हंगामी कपडे',
    ),
)


def ensure_garment_default_categories(store):
    """Create missing garment presets while preserving translated/existing names."""
    if str(store.business_type or '').upper() != 'GARMENTS':
        return []

    existing_names = {
        str(name).strip().casefold()
        for name in Category.objects.filter(store=store).values_list('name', flat=True)
    }
    created = []
    for aliases in GARMENT_DEFAULT_CATEGORY_ALIASES:
        if any(alias.casefold() in existing_names for alias in aliases):
            continue

        name = aliases[0]
        base_slug = slugify(name)[:240] or 'category'
        slug = base_slug
        suffix = 2
        while Category.objects.filter(store=store, slug=slug).exists():
            slug = f'{base_slug[:240 - len(str(suffix)) - 1]}-{suffix}'
            suffix += 1
        category = Category.objects.create(store=store, name=name, slug=slug)
        created.append(category)
        existing_names.add(name.casefold())

    return created
