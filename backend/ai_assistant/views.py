import json
import re
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from django.conf import settings

from products.models import Product
from .ollama import OllamaUnavailable, _strip_reasoning, chat, image_to_base64

IMAGE_SYSTEM_PROMPT = """
You are a careful prescription and medical-document image reader.

Analyze the uploaded image itself. Do NOT invent, assume, or hallucinate information.

Your task is to accurately extract all clearly visible information from the image.

Extract:
1. Medicine/brand names
2. Generic medicine names if clearly written
3. Medicine type: tablet, capsule, syrup, injection, cream, drops, etc.
4. Strength/dosage: mg, ml, mcg, %, etc.
5. Frequency: once daily, twice daily, morning/night, etc.
6. Duration: number of days/weeks if written
7. Before/after food instructions if written
8. Doctor's instructions
9. Diagnosis/condition only if explicitly written
10. Patient name, doctor name, date, and other relevant text only if clearly visible

CRITICAL ACCURACY RULES:

- Read the actual image carefully.
- Medicine names are the highest priority.
- Preserve medicine names exactly as visible whenever possible.
- Never turn ordinary English words into medicine names.
- Never invent a medicine name.
- Never guess unclear handwriting.
- If a medicine name is unclear, write:
  "Unclear medicine name"
  instead of guessing.
- If dosage is unclear, say:
  "Dosage unclear"
- If text is not visible, do not create it.
- Do not use general medical knowledge to fill missing information.
- Do not confuse doctor notes, headings, dates, or patient information with medicine names.
- Do not diagnose the patient.
- Do not recommend starting, stopping, changing, or increasing any medicine.
- If the image is not a prescription, describe what is actually visible instead of pretending it is a prescription.

Return the result in this exact structure:

MEDICINES:
- Medicine name — strength/dosage — frequency — duration
- Medicine name — strength/dosage — frequency — duration

OTHER VISIBLE TEXT:
- ...

UNCLEAR INFORMATION:
- ...

IMPORTANT:
Only report information that can actually be read from the image.
Accuracy is more important than completeness.
"""

IMAGE_SCHEMA = {
    'type': 'object',
    'properties': {
        'answer': {'type': 'string'},
        'extracted_text': {'type': 'string'},
        'medicine_names': {'type': 'array', 'items': {'type': 'string'}},
        'warnings': {'type': 'array', 'items': {'type': 'string'}},
    },
    'required': ['answer', 'extracted_text', 'medicine_names', 'warnings'],
}

TEXT_SCHEMA = {
    'type': 'object',
    'properties': {
        'answer': {
            'type': 'string',
            'description': 'The final customer-facing answer only, without analysis or reasoning.',
        },
    },
    'required': ['answer'],
}

INTENT_SYSTEM_PROMPT = """You are an intent parser for an e-commerce catalog store.
Analyze the customer's query and output:
- intent: one of ["product_price", "product_search", "most_expensive", "cheapest", "newest", "popular", "available", "general_chat"]
- search_term: concise English/Hindi product keyword or category for SQL database query (or "" if general chat).

Output JSON only in this exact structure:
{"intent": "product_price", "search_term": "bike cover"}"""

INTENT_SCHEMA = {
    'type': 'object',
    'properties': {
        'intent': {
            'type': 'string',
            'enum': ['product_price', 'product_search', 'most_expensive', 'cheapest', 'newest', 'popular', 'available', 'general_chat']
        },
        'search_term': {'type': 'string'}
    },
    'required': ['intent', 'search_term']
}

GREETINGS = {'hi', 'hello', 'hey', 'namaste', 'hie', 'hii', 'hiii', 'good morning', 'good evening'}
HELP_REQUESTS = {
    'can you help me', 'can i help me', 'help me', 'i need help',
    'how can you help me', 'what can you help me with',
}
FAST_REPLY = 'Namaste! 👋 Main products aur offers check karne, order tracking, aur prescription image se text/medicine names nikalne mein help kar sakta hu.'


def format_db_products_response(products, query_label: str = '') -> str:
    """Format matching Product querysets into clean, direct user answers."""
    if not products.exists():
        return ""
    if products.count() == 1:
        p = products.first()
        cat = p.category.name if p.category else 'Uncategorized'
        avail = 'In stock' if p.stock_quantity > 0 else 'Out of stock'
        return f"{p.name} (Category: {cat}) ki keemat ₹{p.price:,.2f} hai ({avail})."
    
    lines = []
    for p in products:
        avail = 'In stock' if p.stock_quantity > 0 else 'Out of stock'
        lines.append(f"- {p.name}: ₹{p.price:,.2f} ({avail})")
    prefix = f"Aapke query '{query_label}' ke matching products:" if query_label else "Matching products:"
    return prefix + "\n" + "\n".join(lines)


def extract_scope_filter_term(message: str, trigger_phrases: list[str]) -> str:
    """Extract category or product scope keywords from query by stripping trigger and filler words."""
    msg = message.lower().strip()
    for trigger in trigger_phrases:
        msg = msg.replace(trigger, ' ')

    fillers = [
        r'\bsirf\b', r'\bonly\b', r'\babse\b', r'\bsabse\b', r'\bmai se\b', r'\bme se\b', r'\bmein se\b', r'\bmai\b', r'\bmein\b', r'\bme\b',
        r'\bmujhe\b', r'\bmujhey\b', r'\bmera\b', r'\bmeri\b', r'\bmere\b', r'\bneed\b', r'\bwant\b',
        r'\bvala\b', r'\bwala\b', r'\bvali\b', r'\bwali\b', r'\bvale\b', r'\bwale\b',
        r'\bproduct\b', r'\bproducts\b', r'\bkonsa\b', r'\bkon\b', r'\bsa\b', r'\bsi\b',
        r'\bhai\b', r'\bkya\b', r'\bbatao\b', r'\bbata\b', r'\bchahiye\b', r'\bitem\b', r'\bitems\b',
        r'\bcategory\b', r'\bstore\b', r'\bka\b', r'\bki\b', r'\bke\b', r'\badd\b', r'\badded\b', r'\bhua\b', r'\bhue\b', r'\bhui\b',
        r'\bdikhao\b', r'\bdikhaye\b', r'\blaya\b', r'\blaaye\b', r'\bshow\b', r'\blist\b'
    ]
    for filler in fillers:
        msg = re.sub(filler, ' ', msg, flags=re.IGNORECASE)

    clean_term = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', msg)
    clean_term = re.sub(r'\s+', ' ', clean_term).strip()
    return clean_term if len(clean_term) >= 2 else ""


def filter_queryset_by_scope(qs, scope_term: str):
    """
    Filter Product queryset by scope term using exact phrase first,
    then fallback to word-by-word matching (e.g. 'baby care' -> matches 'baby' in 'Baby Product').
    """
    if not scope_term:
        return qs

    # 1. Exact phrase match
    exact_qs = qs.filter(
        Q(name__icontains=scope_term) | Q(category__name__icontains=scope_term) | Q(description__icontains=scope_term)
    ).distinct()
    if exact_qs.exists():
        return exact_qs

    # 2. Word-by-word match fallback
    words = [w.strip() for w in re.split(r'\s+', scope_term) if len(w.strip()) >= 2]
    if words:
        word_q = Q()
        for w in words:
            word_q |= Q(name__icontains=w) | Q(category__name__icontains=w) | Q(description__icontains=w)
        word_qs = qs.filter(word_q).distinct()
        if word_qs.exists():
            return word_qs

    return qs.none()


def extract_budget_limit(message: str) -> tuple[float | None, str]:
    """
    Extract max price budget (e.g., '100 ke andar', 'under 500', 'below 200', '500 tak')
    and return (max_price, cleaned_message_without_budget_words).
    """
    msg = message.lower().strip()
    max_price = None

    # Patterns matching: 'under 100', 'below 500', 'less than 200', 'budget 500'
    match1 = re.search(r'\b(?:under|below|less than|budget)\s*₹?\s*(\d+(?:\.\d+)?)\b', msg, re.IGNORECASE)
    if match1:
        max_price = float(match1.group(1))
        msg = msg.replace(match1.group(0), ' ')

    # Patterns matching: '100 ke andar', '500 se kam', '300 tak', '500 se niche', '500 ke niche'
    if max_price is None:
        match2 = re.search(r'\b₹?\s*(\d+(?:\.\d+)?)\s*(?:ke andar|se kam|tak|se niche|ke niche)\b', msg, re.IGNORECASE)
        if match2:
            max_price = float(match2.group(1))
            msg = msg.replace(match2.group(0), ' ')

    return max_price, msg


def check_fast_path_query(message: str) -> str | None:
    """
    Direct Rule-based Python/Django DB lookup (0ms AI latency, works even if Ollama is down).
    Handles scope filtering (e.g. "baby products", "electronics") and stock awareness gracefully.
    """
    msg_lower = message.lower().strip()

    # 0. Platform FAQ / General Features Fast-Path
    delivery_keywords = ['home delivery', 'delivery available', 'delivery hoti hai', 'delivery kab', 'shipping available', 'home delivery available']
    if any(kw in msg_lower for kw in delivery_keywords):
        return "Haan! MultiStore platform par home delivery available hai. Aap easily platform par order place kar sakte ho."

    payment_keywords = ['cash on delivery', 'cod available', 'payment options', 'payment method', 'gpay', 'upi payment']
    if any(kw in msg_lower for kw in payment_keywords):
        return "Platform par Online Payment (UPI, Credit/Debit Cards, Netbanking) aur Cash on Delivery (COD) dono options available hain!"

    tracking_keywords = ['track order', 'order tracking', 'order status', 'mera order kaha hai']
    if any(kw in msg_lower for kw in tracking_keywords):
        return "Aap apne account ke 'My Orders' section me ja kar live order tracking status check kar sakte ho."

    store_setup_keywords = ['store kaise banaye', 'seller registration', 'dukan kaise khole', 'register store']
    if any(kw in msg_lower for kw in store_setup_keywords):
        return "Aap Seller Dashboard par ja kar 2 minute me apna online multi-vendor store register karke products sell karna start kar sakte ho!"

    address_keywords = ['store address', 'dukan address', 'store ka address', 'dukan ka address', 'address kya hai', 'location kya hai', 'store location', 'dukan location', 'store kaha hai']
    if any(kw in msg_lower for kw in address_keywords):
        return "Yeh ek online multi-vendor marketplace platform hai. Har seller/store ka business address unke specific Product Page aur Seller Store Profile par visible hota hai."

    # 1. Most Expensive Product Query
    expensive_triggers = [
        'sabse mehnga', 'sabse mehenga', 'sabse mehangi', 'sabse mehgi',
        'most expensive', 'highest price', 'highest-priced', 'max price',
        'costliest', 'expensive product', 'costliest product', 'sabse high price',
        'zyada price', 'ziyada price', 'mehnga product', 'mehnga', 'mehenga', 'mehangi', 'mehgi', 'costliest', 'expensive'
    ]
    if any(trigger in msg_lower for trigger in expensive_triggers):
        scope_term = extract_scope_filter_term(message, expensive_triggers)
        all_published = Product.objects.filter(is_published=True).select_related('category')
        if scope_term:
            all_published = filter_queryset_by_scope(all_published, scope_term)
            if not all_published.exists():
                return None

        item = all_published.order_by('-price').first()
        if not item:
            return "Filhal catalog me koi published product nahi hai."

        cat = item.category.name if item.category else 'Uncategorized'
        prefix = f"Aapke query '{scope_term}' ke products me " if scope_term else ""
        if item.stock_quantity > 0:
            return f"{prefix}Sabse mehnga product {item.name} (Category: {cat}) hai, jiski keemat ₹{item.price:,.2f} hai (In stock)."
        else:
            in_stock_item = all_published.filter(stock_quantity__gt=0).order_by('-price').first()
            if in_stock_item:
                in_cat = in_stock_item.category.name if in_stock_item.category else 'Uncategorized'
                return (
                    f"{prefix}Overall catalog me sabse mehnga product {item.name} (Category: {cat}) hai — ₹{item.price:,.2f} (Out of stock).\n"
                    f"Available (In-stock) products me sabse mehnga product {in_stock_item.name} (Category: {in_cat}) hai — ₹{in_stock_item.price:,.2f}."
                )
            return f"{prefix}Sabse mehnga product {item.name} (Category: {cat}) hai, jiski keemat ₹{item.price:,.2f} hai (Currently Out of stock)."

    # 2. Cheapest Product Query
    cheapest_triggers = [
        'sabse sasta', 'sabse sasti', 'cheapest', 'lowest price', 'lowest-priced',
        'min price', 'least expensive', 'cheapest product', 'sabse kam price',
        'kam price', 'kam daam', 'sasta product', 'kam rate', 'sasta', 'sasti'
    ]
    if any(trigger in msg_lower for trigger in cheapest_triggers):
        scope_term = extract_scope_filter_term(message, cheapest_triggers)
        all_published = Product.objects.filter(is_published=True).select_related('category')
        if scope_term:
            all_published = filter_queryset_by_scope(all_published, scope_term)
            if not all_published.exists():
                return None

        item = all_published.order_by('price').first()
        if not item:
            return "Filhal catalog me koi published product nahi hai."

        cat = item.category.name if item.category else 'Uncategorized'
        prefix = f"Aapke query '{scope_term}' ke products me " if scope_term else ""
        if item.stock_quantity > 0:
            return f"{prefix}Sabse sasta product {item.name} (Category: {cat}) hai, jiski keemat ₹{item.price:,.2f} hai (In stock)."
        else:
            in_stock_item = all_published.filter(stock_quantity__gt=0).order_by('price').first()
            if in_stock_item:
                in_cat = in_stock_item.category.name if in_stock_item.category else 'Uncategorized'
                return (
                    f"{prefix}Overall catalog me sabse sasta product {item.name} (Category: {cat}) hai — ₹{item.price:,.2f} (Out of stock).\n"
                    f"Available (In-stock) products me sabse sasta product {in_stock_item.name} (Category: {in_cat}) hai — ₹{in_stock_item.price:,.2f}."
                )
            return f"{prefix}Sabse sasta product {item.name} (Category: {cat}) hai, jiski keemat ₹{item.price:,.2f} hai (Currently Out of stock)."

    # 3. Newest / Latest Product Query
    newest_triggers = [
        'sabse naya', 'sabse nahi', 'latest product', 'newest product', 'recently added',
        'naya product', 'new addition', 'latest addition', 'recent product', 'latest item',
        'latest', 'newest', 'recent', 'recently', 'naya', 'nayi', 'aaj', 'today'
    ]
    if any(trigger in msg_lower for trigger in newest_triggers):
        scope_term = extract_scope_filter_term(message, newest_triggers)
        all_published = Product.objects.filter(is_published=True).select_related('category')
        if scope_term:
            all_published = filter_queryset_by_scope(all_published, scope_term)
            if not all_published.exists():
                return None

        item = all_published.order_by('-created_at').first()
        if not item:
            return "Filhal catalog me koi published product nahi hai."

        cat = item.category.name if item.category else 'Uncategorized'
        added_at = item.created_at.strftime('%Y-%m-%d')
        prefix = f"Aapke query '{scope_term}' ke products me " if scope_term else ""
        if item.stock_quantity > 0:
            return f"{prefix}Sabse naya product {item.name} (Category: {cat}) hai, jo {added_at} ko add hua tha — Keemat ₹{item.price:,.2f} (In stock)."
        else:
            in_stock_item = all_published.filter(stock_quantity__gt=0).order_by('-created_at').first()
            if in_stock_item:
                in_cat = in_stock_item.category.name if in_stock_item.category else 'Uncategorized'
                in_added_at = in_stock_item.created_at.strftime('%Y-%m-%d')
                return (
                    f"{prefix}Overall sabse naya product {item.name} (Category: {cat}) hai — ₹{item.price:,.2f} (Added {added_at}, Out of stock).\n"
                    f"Available (In-stock) products me sabse naya product {in_stock_item.name} (Category: {in_cat}) hai — ₹{in_stock_item.price:,.2f} (Added {in_added_at})."
                )
            return f"{prefix}Sabse naya product {item.name} (Category: {cat}) hai — ₹{item.price:,.2f} (Currently Out of stock)."

    # 4. Popular / Trending / Most Viewed Products Query
    popular_triggers = [
        'popular', 'trending', 'best selling', 'top products', 'famous product',
        'sabse popular', 'famous products', 'popular items', 'trending items',
        'top items', 'best products'
    ]
    if any(trigger in msg_lower for trigger in popular_triggers):
        scope_term = extract_scope_filter_term(message, popular_triggers)
        all_published = Product.objects.filter(is_published=True).select_related('category')
        if scope_term:
            all_published = filter_queryset_by_scope(all_published, scope_term)
            if not all_published.exists():
                return None

        top_items = all_published.order_by('-views_count', '-created_at')[:5]
        if not top_items.exists():
            return "Filhal catalog me koi published product nahi hai."

        prefix = f"Aapke query '{scope_term}' ke popular products:" if scope_term else "Store ke top popular products:"
        lines = []
        for p in top_items:
            avail = 'In stock' if p.stock_quantity > 0 else 'Out of stock'
            cat = p.category.name if p.category else 'Uncategorized'
            lines.append(f"- {p.name} (Category: {cat}): ₹{p.price:,.2f} ({avail})")
        return prefix + "\n" + "\n".join(lines)

    # 5. Available / In-Stock Products Query
    available_triggers = [
        'available product', 'available products', 'in stock', 'in-stock',
        'sirf available', 'stock me', 'stock mein', 'available items',
        'in stock items', 'stock items'
    ]
    if any(trigger in msg_lower for trigger in available_triggers):
        scope_term = extract_scope_filter_term(message, available_triggers)
        all_published = Product.objects.filter(is_published=True, stock_quantity__gt=0).select_related('category')
        if scope_term:
            all_published = filter_queryset_by_scope(all_published, scope_term)
            if not all_published.exists():
                return None

        items = all_published.order_by('price')[:10]
        if not items.exists():
            return "Filhal catalog me koi product in stock nahi hai."

        prefix = f"Aapke query '{scope_term}' ke available (In-stock) products:" if scope_term else "Catalog ke currently available (In-stock) products:"
        lines = []
        for p in items:
            cat = p.category.name if p.category else 'Uncategorized'
            lines.append(f"- {p.name} (Category: {cat}): ₹{p.price:,.2f} (In stock: {p.stock_quantity})")
        return prefix + "\n" + "\n".join(lines)

    # 6. Budget-Aware / Direct Product Search (e.g. "100 ke andar shampoo", "under 500 bike cover", "shampoo cost")
    max_price, msg_without_budget = extract_budget_limit(message)

    # Guardrail: Exclude general platform / store FAQ questions (e.g. "store kaha hai", "where is store", "delivery time")
    platform_meta_phrases = [
        'store kaha', 'dukan kaha', 'dukan kidhar', 'store kidhar', 'where is store', 'kaha hai', 'kidhar hai',
        'store address', 'dukan address', 'delivery time', 'refund policy', 'contact number', 'phone number',
        'how to buy', 'how to order', 'how to sell', 'seller account', 'admin'
    ]
    if any(phrase in msg_lower for phrase in platform_meta_phrases):
        return None

    clean_query = extract_scope_filter_term(msg_without_budget, ['price', 'rate', 'cost', 'kitne'])
    meta_keywords = {'store', 'stores', 'dukan', 'dukane', 'platform', 'website', 'app', 'location', 'address', 'delivery', 'shipping', 'payment', 'refund', 'policy', 'contact', 'seller', 'buyer', 'account', 'login', 'register', 'help', 'support', 'admin'}
    if clean_query.lower() in meta_keywords:
        return None

    # Base queryset for product search
    base_qs = Product.objects.filter(is_published=True).select_related('category')

    if max_price is not None:
        budget_qs = base_qs.filter(price__lte=max_price)
        if clean_query:
            matched_qs = filter_queryset_by_scope(budget_qs, clean_query)
            if matched_qs.exists():
                items = matched_qs.order_by('price')[:5]
                prefix = f"Aapke budget (₹{max_price:,.2f} ke andar) ke matching products:"
                lines = []
                for p in items:
                    avail = f"In stock: {p.stock_quantity}" if p.stock_quantity > 0 else 'Out of stock'
                    cat = p.category.name if p.category else 'Uncategorized'
                    lines.append(f"- {p.name} (Category: {cat}): ₹{p.price:,.2f} ({avail})")
                return prefix + "\n" + "\n".join(lines)
            else:
                # Check if products matching clean_query exist above max_price
                all_scope_items = filter_queryset_by_scope(base_qs, clean_query).order_by('price')
                if all_scope_items.exists():
                    lowest_item = all_scope_items.first()
                    cat = lowest_item.category.name if lowest_item.category else 'Uncategorized'
                    avail = 'In stock' if lowest_item.stock_quantity > 0 else 'Out of stock'
                    return (
                        f"Aapke budget (₹{max_price:,.2f} ke andar) me koi '{clean_query}' product available nahi hai.\n"
                        f"Catalog me lowest price '{clean_query}' product: {lowest_item.name} (Category: {cat}) — ₹{lowest_item.price:,.2f} ({avail})."
                    )
                return f"₹{max_price:,.2f} ke andar koi product catalog me available nahi hai."
        else:
            items = budget_qs.order_by('price')[:5]
            if items.exists():
                prefix = f"₹{max_price:,.2f} ke andar available products:"
                lines = []
                for p in items:
                    avail = f"In stock: {p.stock_quantity}" if p.stock_quantity > 0 else 'Out of stock'
                    cat = p.category.name if p.category else 'Uncategorized'
                    lines.append(f"- {p.name} (Category: {cat}): ₹{p.price:,.2f} ({avail})")
                return prefix + "\n" + "\n".join(lines)
            return f"₹{max_price:,.2f} ke andar koi product catalog me available nahi hai."

    if len(clean_query) >= 3:
        # Prioritize matching product name directly before matching category names
        name_matches = Product.objects.filter(is_published=True).select_related('category').filter(
            name__icontains=clean_query
        ).order_by('price')[:5]
        if name_matches.exists():
            return format_db_products_response(name_matches, clean_query)

        # Split words for name match (e.g. "bike cover" -> name must contain both "bike" and "cover")
        words = [w.strip() for w in re.split(r'\s+', clean_query) if len(w.strip()) >= 2]
        if words:
            word_name_q = Q()
            for word in words:
                word_name_q &= Q(name__icontains=word)
            word_matches = Product.objects.filter(is_published=True).select_related('category').filter(word_name_q).order_by('price')[:5]
            if word_matches.exists():
                return format_db_products_response(word_matches, clean_query)

        matches = Product.objects.filter(is_published=True).select_related('category').filter(
            Q(name__icontains=clean_query) | Q(description__icontains=clean_query)
        ).order_by('price')[:5]
        if matches.exists():
            return format_db_products_response(matches, clean_query)

    return None


def query_db_by_search_term(search_term: str):
    """Query Django database using extracted search terms/keywords, prioritizing direct product name matches."""
    if not search_term:
        return None

    clean_term = search_term.strip()
    # 1. Try exact/contains name match first
    name_matches = Product.objects.filter(is_published=True).select_related('category').filter(
        name__icontains=clean_term
    ).order_by('price')[:5]
    if name_matches.exists():
        return format_db_products_response(name_matches, clean_term)

    # 2. Try word-by-word name match (all keywords must be in product name)
    words = [w.strip() for w in re.split(r'\s+', clean_term) if len(w.strip()) >= 2]
    if not words:
        return None

    word_name_q = Q()
    for word in words:
        word_name_q &= Q(name__icontains=word)

    word_name_matches = Product.objects.filter(is_published=True).select_related('category').filter(word_name_q).order_by('price')[:5]
    if word_name_matches.exists():
        return format_db_products_response(word_name_matches, clean_term)

    # 3. Fallback to description / category match
    query_filter = Q()
    for word in words:
        query_filter |= Q(name__icontains=word) | Q(description__icontains=word) | Q(category__name__icontains=word)

    matches = Product.objects.filter(is_published=True).select_related('category').filter(query_filter).distinct().order_by('price')[:5]
    if matches.exists():
        return format_db_products_response(matches, clean_term)
    return None


def get_live_products_context() -> str:
    """Provide compact catalog facts for general assistant questions."""
    try:
        all_published = Product.objects.filter(is_published=True).select_related('category')
        if not all_published.exists():
            return "No published products were found."

        cheapest_item = all_published.order_by('price').first()
        most_expensive_item = all_published.order_by('-price').first()
        newest_item = all_published.order_by('-created_at').first()

        summary_lines = []
        if most_expensive_item:
            cat = most_expensive_item.category.name if most_expensive_item.category else 'Uncategorized'
            avail = 'In stock' if most_expensive_item.stock_quantity > 0 else 'Out of stock'
            summary_lines.append(f"- Most expensive product (highest price): {most_expensive_item.name} (Category: {cat}) — ₹{most_expensive_item.price} — {avail}")
        if cheapest_item:
            cat = cheapest_item.category.name if cheapest_item.category else 'Uncategorized'
            avail = 'In stock' if cheapest_item.stock_quantity > 0 else 'Out of stock'
            summary_lines.append(f"- Cheapest product (lowest price): {cheapest_item.name} (Category: {cat}) — ₹{cheapest_item.price} — {avail}")
        if newest_item:
            cat = newest_item.category.name if newest_item.category else 'Uncategorized'
            added_at = newest_item.created_at.strftime('%Y-%m-%d %H:%M UTC')
            summary_lines.append(f"- Newest/latest product added: {newest_item.name} (Category: {cat}) — ₹{newest_item.price} — Added: {added_at}")

        lines = []
        for p in all_published.order_by('price')[:15]:
            avail = 'In stock' if p.stock_quantity > 0 else 'Out of stock'
            cat = p.category.name if p.category else 'Uncategorized'
            lines.append(f"- {p.name} (Category: {cat}): ₹{p.price} — {avail}")

        return (
            "Catalog Facts:\n"
            + "\n".join(summary_lines)
            + "\n\nProducts Sample:\n"
            + "\n".join(lines)
        )
    except Exception:
        return ""


class AssistantChatView(APIView):
    """Public, rate-limited hybrid AI assistant for customer and seller interfaces."""
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_assistant'

    @staticmethod
    def get_chat_history(raw_history):
        """Accept only a small, plain-text user/assistant conversation window."""
        if not raw_history:
            return []
        try:
            entries = json.loads(raw_history) if isinstance(raw_history, str) else raw_history
        except (TypeError, json.JSONDecodeError):
            return []
        if not isinstance(entries, list):
            return []

        history = []
        for entry in entries[-6:]:
            if not isinstance(entry, dict) or entry.get('role') not in {'user', 'assistant'}:
                continue
            content = str(entry.get('text', '')).strip()
            if content:
                history.append({'role': entry['role'], 'content': content[:600]})
        return history

    def post(self, request):
        message = str(request.data.get('message', '')).strip()
        image = request.FILES.get('image')
        history = self.get_chat_history(request.data.get('history'))
        if not message and not image:
            return Response({'detail': 'Send a message or an image.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fast instantaneous response for common greetings
        if not image and message.lower() in GREETINGS | HELP_REQUESTS:
            return Response({
                'type': 'chat',
                'answer': FAST_REPLY,
            })

        # 2. Rule-Based DB Fast Path (0ms AI latency - works even if Ollama is down)
        if not image and message:
            fast_path_answer = check_fast_path_query(message)
            if fast_path_answer:
                return Response({'type': 'chat', 'answer': fast_path_answer})

        try:
            if image:
                encoded_image = image_to_base64(image)
                prompt = message or 'Read this image carefully. Extract all visible text and any medicine names.'
                content = chat(
                    model=getattr(settings, 'OLLAMA_VISION_MODEL', 'moondream'),
                    messages=[
                        {'role': 'system', 'content': IMAGE_SYSTEM_PROMPT},
                        {'role': 'user', 'content': prompt, 'images': [encoded_image]},
                    ],
                    response_format=IMAGE_SCHEMA,
                    max_tokens=150,
                )
                try:
                    result = json.loads(content)
                except json.JSONDecodeError:
                    result = {'answer': content, 'extracted_text': '', 'medicine_names': [], 'warnings': ['Please verify all text with a pharmacist or doctor.']}
                result['type'] = 'image_analysis'
                return Response(result)

            # 3. Lightweight Intent Classifier (Tiny prompt - ~30 tokens instead of 500+ tokens!)
            try:
                intent_raw = chat(
                    model=getattr(settings, 'OLLAMA_TEXT_MODEL', 'tinyllama'),
                    messages=[
                        {'role': 'system', 'content': INTENT_SYSTEM_PROMPT},
                        {'role': 'user', 'content': message},
                    ],
                    response_format=INTENT_SCHEMA,
                    max_tokens=60,
                )
                intent_data = json.loads(intent_raw)
                intent = intent_data.get('intent')
                search_term = intent_data.get('search_term', '').strip()

                if intent in ['most_expensive', 'cheapest', 'newest', 'popular', 'available']:
                    fast_ans = check_fast_path_query(intent.replace('_', ' '))
                    if fast_ans:
                        return Response({'type': 'chat', 'answer': fast_ans})

                if intent in ['product_price', 'product_search'] and search_term:
                    db_ans = query_db_by_search_term(search_term)
                    if db_ans:
                        return Response({'type': 'chat', 'answer': db_ans})
            except Exception:
                # If intent classification fails or returns non-JSON, fallback gracefully
                pass

            # 4. Fallback General Chat with compact context and platform knowledge
            catalog_info = get_live_products_context()
            text_system_prompt = f"""You are the MultiStore E-Commerce AI Assistant. Reply directly in the user's language in at most 2 short sentences.

PLATFORM KNOWLEDGE:
- Home Delivery: Yes, home delivery is fully available across all stores on this platform.
- Payment Options: Online payments (UPI, Cards, Netbanking) and Cash on Delivery (COD) are supported.
- Store Creation: Sellers can register and create their multi-vendor online stores easily.
- Store Address / Location: MultiStore is an online multi-vendor platform. Individual store addresses are located on Product detail pages and Seller Profile pages.
- Order Tracking: Customers can track their live order status under My Orders.

PRODUCT CATALOG FACTS:
{catalog_info}

Use the catalog facts above when answering product, price, or stock questions. Output ONLY the final customer-facing answer without thinking or preamble."""
            answer = chat(
                model=getattr(settings, 'OLLAMA_TEXT_MODEL', 'tinyllama'),
                messages=[
                    {'role': 'system', 'content': text_system_prompt},
                    *history,
                    {'role': 'user', 'content': message},
                ],
                response_format=TEXT_SCHEMA,
                max_tokens=getattr(settings, 'OLLAMA_TEXT_RESPONSE_TOKENS', 120),
            )
            try:
                parsed = json.loads(answer)
                answer = parsed['answer'].strip()
            except (json.JSONDecodeError, KeyError, AttributeError):
                answer = answer.strip()

            answer = _strip_reasoning(answer)

            if not answer:
                return Response({'detail': 'AI returned an empty response. Please try again.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({'type': 'chat', 'answer': answer})
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except OllamaUnavailable as exc:
            # If Ollama is down but user query can be matched against DB keywords, try one final search fallback
            db_fallback = query_db_by_search_term(message)
            if db_fallback:
                return Response({'type': 'chat', 'answer': db_fallback})
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
