import logging
import hashlib
import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Request timeout in seconds for external Mappls APIs
MAPPLS_TIMEOUT_SECONDS = 6


def get_mappls_static_key() -> str:
    """Safely retrieve and sanitize Mappls Static Key from Django settings / environment."""
    key = getattr(settings, 'MAPPLS_STATIC_KEY', '') or ''
    key = key.strip(" '\"")
    # Ignore unset or template placeholders
    if not key or key.lower().startswith('xxxx') or key == 'your_key_here':
        return ''
    return key


def _extract_address_from_item(item: dict) -> str:
    """Build an address from the most specific Mappls fields available."""
    if not isinstance(item, dict):
        return ''

    parts = []
    def append(value):
        clean = str(value or '').strip()
        if clean and clean.casefold() not in {part.casefold() for part in parts}:
            parts.append(clean)

    # Prefer street/building/locality fields over formatted_address, which may
    # overemphasize administrative district labels for the actual GPS point.
    append(item.get('houseName') or item.get('house_name'))
    append(item.get('houseNumber') or item.get('house_number'))
    append(item.get('street'))
    append(item.get('subSubLocality') or item.get('subsubLocality') or item.get('sub_sub_locality'))
    append(item.get('subLocality') or item.get('sub_locality'))
    append(item.get('locality'))

    # Some Mappls results return a village instead of a city/locality.
    locality_parts_present = any(
        item.get(key)
        for key in ('subSubLocality', 'subsubLocality', 'sub_sub_locality', 'subLocality', 'sub_locality', 'locality')
    )
    village_or_city = item.get('village') or item.get('city')
    if not locality_parts_present:
        append(village_or_city)
    if not locality_parts_present and not village_or_city:
        append(item.get('subDistrict') or item.get('sub_district'))
        append(item.get('district'))

    pincode = item.get('pincode') or item.get('pin_code')
    append(item.get('state'))
    append(pincode)

    if parts:
        return ', '.join(parts)

    # Keep a provider-formatted result only as a last resort when no structured
    # address components are present.
    for key in ('formatted_address', 'formattedAddress', 'display_name', 'address'):
        value = item.get(key)
        if value and isinstance(value, str) and value.strip():
            return value.strip()
    return ''


def _extract_coordinates_from_item(item: dict):
    """Extract latitude and longitude floats from a Mappls result item."""
    if not isinstance(item, dict):
        return None, None

    lat_val = item.get('latitude') if item.get('latitude') is not None else item.get('lat')
    lng_val = item.get('longitude') if item.get('longitude') is not None else (item.get('lng') if item.get('lng') is not None else item.get('lon'))

    if lat_val is None or lng_val is None:
        return None, None

    try:
        lat = round(float(lat_val), 6)
        lng = round(float(lng_val), 6)
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng
    except (TypeError, ValueError):
        pass

    return None, None


def mappls_geocode(address: str) -> dict | None:
    """
    Geocode an Indian street address using Mappls Static Key.

    Returns:
        dict with {'latitude': float, 'longitude': float, 'display_name': str, 'source': 'mappls'}
        or None if unconfigured, not found, or failed.
    """
    static_key = get_mappls_static_key()
    if not static_key:
        return None

    clean_address = ' '.join(str(address or '').split())
    if len(clean_address) < 3:
        return None

    # Cache lookup (30 days)
    addr_hash = hashlib.sha256(clean_address.lower().encode('utf-8')).hexdigest()[:24]
    cache_key = f"mappls:geocode:{addr_hash}"
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}

    headers = {
        'User-Agent': 'ApaniDukan/1.0 (LocationService)',
        'Accept': 'application/json',
    }

    # Endpoints to try in order:
    # 1. AdvancedMaps v1 (REST Key in path)
    # 2. Search Geocode API (access_token in query)
    endpoints = [
        (
            f"{getattr(settings, 'MAPPLS_API_BASE_URL', 'https://apis.mappls.com/advancedmaps/v1')}/{static_key}/geo_code",
            {'addr': clean_address},
        ),
        (
            f"{getattr(settings, 'MAPPLS_SEARCH_BASE_URL', 'https://search.mappls.com/search/address')}/geocode",
            {'access_token': static_key, 'address': clean_address},
        ),
        (
            f"https://apis.mapmyindia.com/advancedmaps/v1/{static_key}/geo_code",
            {'addr': clean_address},
        ),
    ]

    for url, params in endpoints:
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=MAPPLS_TIMEOUT_SECONDS)
            if resp.status_code != 200:
                continue

            data = resp.json()
            if not isinstance(data, dict):
                continue

            # Check responseCode if present (200 is success in Mappls)
            code = data.get('responseCode')
            if code is not None and str(code) not in ('200', '0'):
                continue

            # Candidate result items
            candidates = []
            cop_results = data.get('copResults')
            if isinstance(cop_results, list):
                candidates.extend(cop_results)
            elif isinstance(cop_results, dict):
                candidates.append(cop_results)

            results = data.get('results')
            if isinstance(results, list):
                candidates.extend(results)
            elif isinstance(results, dict):
                candidates.append(results)

            for item in candidates:
                lat, lng = _extract_coordinates_from_item(item)
                if lat is not None and lng is not None:
                    display_name = _extract_address_from_item(item) or clean_address
                    result = {
                        'latitude': lat,
                        'longitude': lng,
                        'display_name': display_name[:500],
                        'source': 'mappls',
                    }
                    cache.set(cache_key, result, timeout=60 * 60 * 24 * 30)
                    return result
        except requests.RequestException as exc:
            logger.warning("Mappls geocode request error on %s: %s", url, exc)
            continue
        except Exception as exc:
            logger.warning("Mappls geocode parsing error on %s: %s", url, exc)
            continue

    return None


def mappls_reverse_geocode(latitude: float, longitude: float) -> dict | None:
    """
    Reverse geocode GPS coordinates to an address using Mappls Static Key.

    Returns:
        dict with {'display_name': str, 'latitude': float, 'longitude': float, 'source': 'mappls'}
        or None if unconfigured, not found, or failed.
    """
    static_key = get_mappls_static_key()
    if not static_key:
        return None

    try:
        lat = round(float(latitude), 6)
        lng = round(float(longitude), 6)
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return None
    except (TypeError, ValueError):
        return None

    cache_key = f"mappls:rev:v2:{lat:.6f}:{lng:.6f}"
    cached = cache.get(cache_key)
    if cached:
        return {**cached, 'cached': True}

    headers = {
        'User-Agent': 'ApaniDukan/1.0 (LocationService)',
        'Accept': 'application/json',
    }

    endpoints = [
        (
            f"{getattr(settings, 'MAPPLS_API_BASE_URL', 'https://apis.mappls.com/advancedmaps/v1')}/{static_key}/rev_geocode",
            {'lat': lat, 'lng': lng},
        ),
        (
            f"{getattr(settings, 'MAPPLS_SEARCH_BASE_URL', 'https://search.mappls.com/search/address')}/rev-geocode",
            {'access_token': static_key, 'lat': lat, 'lng': lng},
        ),
        (
            f"https://apis.mapmyindia.com/advancedmaps/v1/{static_key}/rev_geocode",
            {'lat': lat, 'lng': lng},
        ),
    ]

    for url, params in endpoints:
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=MAPPLS_TIMEOUT_SECONDS)
            if resp.status_code != 200:
                continue

            data = resp.json()
            if not isinstance(data, dict):
                continue

            code = data.get('responseCode')
            if code is not None and str(code) not in ('200', '0'):
                continue

            candidates = []
            results = data.get('results')
            if isinstance(results, list):
                candidates.extend(results)
            elif isinstance(results, dict):
                candidates.append(results)

            cop_results = data.get('copResults')
            if isinstance(cop_results, list):
                candidates.extend(cop_results)
            elif isinstance(cop_results, dict):
                candidates.append(cop_results)

            for item in candidates:
                addr = _extract_address_from_item(item)
                if addr:
                    result = {
                        'display_name': addr[:500],
                        'latitude': lat,
                        'longitude': lng,
                        'source': 'mappls',
                    }
                    cache.set(cache_key, result, timeout=60 * 60 * 24 * 30)
                    return result
        except requests.RequestException as exc:
            logger.warning("Mappls reverse geocode request error on %s: %s", url, exc)
            continue
        except Exception as exc:
            logger.warning("Mappls reverse geocode parsing error on %s: %s", url, exc)
            continue

    return None
