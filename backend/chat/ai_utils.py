import re
from products.models import Product

from django.db.models import Q

def parse_price_condition(query):
    """
    Extracts price conditions like 'under 500', '< 500', 'below 500'
    Returns a tuple (max_price, clean_query)
    """
    query = query.lower()
    
    # Regex to match "under/below/< X" where X is a number
    match = re.search(r'(under|below|<|less than)\s*rs\.?\s*(\d+)', query)
    if not match:
        match = re.search(r'(under|below|<|less than)\s*(\d+)', query)
        
    if match:
        max_price = float(match.group(2))
        clean_query = query.replace(match.group(0), '').strip()
        return max_price, clean_query
        
    return None, query

def process_ai_search(query, store_id):
    """
    A smart local parser that acts like AI.
    In the future, this can be swapped out with a real LLM call (e.g., Gemini).
    """
    max_price, clean_query = parse_price_condition(query)
    
    # Base queryset
    qs = Product.objects.filter(store_id=store_id, is_published=True)
    
    # Filter by price if found
    if max_price is not None:
        qs = qs.filter(price__lte=max_price)
        
    # Remove filler words (English + basic Hinglish) for better matching
    fillers = [
        'i', 'want', 'a', 'an', 'the', 'some', 'looking', 'for', 'show', 'me', 'need', 'buy', 'product', 'products', 'item', 'items',
        'mujhe', 'chahiye', 'chaiye', 'dikhao', 'hai', 'de', 'do', 'wala', 'wali', 'ke', 'ka', 'ki', 'mein', 'mera', 'meri'
    ]
    words = [w for w in clean_query.split() if w not in fillers]
    
    if words:
        # Require all important words to be present somewhere in the product
        for word in words:
            qs = qs.filter(
                Q(name__icontains=word) | 
                Q(description__icontains=word) |
                Q(short_description__icontains=word) |
                Q(category__name__icontains=word)
            )
        
    return qs
