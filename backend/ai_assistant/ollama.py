"""Resilient, auto-discovering client for locally hosted Ollama server."""
import base64
import io
import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image
from django.conf import settings


class OllamaUnavailable(Exception):
    """Raised when the configured Ollama server cannot provide a response."""


_models_cache = {'base_url': None, 'models': [], 'expires_at': 0.0}
MODELS_CACHE_SECONDS = 30


def get_available_models(base_url: str) -> list:
    """Fetch installed model names from local Ollama server."""
    now = time.monotonic()
    if _models_cache['base_url'] == base_url and now < _models_cache['expires_at']:
        return _models_cache['models']

    try:
        req = Request(f'{base_url}/api/tags', method='GET')
        with urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode('utf-8'))
            models = [m.get('name') for m in data.get('models', []) if m.get('name')]
            _models_cache.update(base_url=base_url, models=models, expires_at=now + MODELS_CACHE_SECONDS)
            return models
    except Exception:
        return []


def is_vision_model(model_name: str) -> bool:
    """Check if model name indicates multimodal/vision support."""
    if not model_name:
        return False
    m = model_name.lower()
    return any(k in m for k in ['vision', 'vl', 'llava', 'moondream', 'bakllava', 'minicpm'])


def resolve_model(requested_model: str, available: list, has_image: bool = False) -> str:
    """Match requested model tag (e.g. moondream -> moondream:latest) or select appropriate fallback."""
    if not available:
        return requested_model

    req_lower = (requested_model or '').lower()
    req_base = req_lower.split(':')[0]

    # 1. Exact match
    for m in available:
        if m.lower() == req_lower:
            return m

    # 2. Base match (e.g., 'moondream' -> 'moondream:latest')
    for m in available:
        if m.lower().split(':')[0] == req_base:
            return m

    # 3. If image attached, pick first vision model from available
    if has_image:
        vision_models = [m for m in available if is_vision_model(m)]
        if vision_models:
            return vision_models[0]

    return available[0]


def _strip_reasoning(content: str) -> str:
    """Remove leaked internal reasoning and system tags from small-model chat output."""
    if not content:
        return content

    import re

    # Strip explicit <think>...</think> blocks if present
    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
    # Remove XML-like system/environment tags and their contents
    content = re.sub(r'<environment_details>.*?</environment_details>', '', content, flags=re.DOTALL)
    content = re.sub(r'<system_info>.*?</system_info>', '', content, flags=re.DOTALL)
    content = re.sub(r'<[^>]+>', '', content)

    reasoning_patterns = (
        'the user is asking',
        'i need to check',
        'looking at the',
        'looking at',
        'i should',
        'let me',
        'wait,',
        'hmm,',
        'actually,',
        'first,',
        'now,',
        'so,',
        'based on the',
        'i can see',
        'the user wants',
        'the user needs',
        'i will',
        'i will now',
        'the first item',
        'the newest',
        'the last entry',
        'all other items',
        'to find the',
        'checking the',
        'current time:',
        'working directory:',
        'workspace root',
        'open tabs:',
    )

    def _is_reasoning(line: str) -> bool:
        lower = line.lower().strip()
        if lower.startswith('"answer":'):
            lower = lower.split('"answer":', 1)[1].strip().lstrip('":\' ')
        elif lower.startswith("'answer':"):
            lower = lower.split("'answer':", 1)[1].strip().lstrip('":\' ')

        return any(
            lower.startswith(p)
            or lower.startswith('"' + p)
            or lower.startswith("'" + p)
            or (':' in lower and lower.split(':', 1)[1].strip().startswith(p))
            for p in reasoning_patterns
        )

    lines = content.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('```') or stripped.startswith('---'):
            continue
        if _is_reasoning(stripped):
            continue
        cleaned.append(stripped)
    return '\n'.join(cleaned).strip()


def chat(*, messages, model, response_format=None, max_tokens=150):
    base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://127.0.0.1:11434').rstrip('/')
    available = get_available_models(base_url)

    has_image = any('images' in m for m in messages if isinstance(m, dict))
    chosen_model = resolve_model(model, available, has_image)

    # CRITICAL: If the selected model is text-only, remove raw 'images' array to prevent HTTP 400 Multimodal error
    sanitized_messages = []
    for msg in messages:
        if isinstance(msg, dict):
            m = dict(msg)
            if has_image and not is_vision_model(chosen_model):
                m.pop('images', None)
                if m.get('role') == 'user':
                    m['content'] = m.get('content', '') + "\n[Customer uploaded an image for analysis]"
            sanitized_messages.append(m)
        else:
            sanitized_messages.append(msg)

    disable_thinking = (
        chosen_model.lower().startswith('qwen3')
        and getattr(settings, 'OLLAMA_DISABLE_THINKING', True)
    )
    if disable_thinking:
        # llama.cpp versions that expose an Ollama-compatible /api/chat route
        # may ignore Ollama's `think: false`.  A completed thinking block in a
        # trailing assistant message is the Qwen chat-template workaround: the
        # generated continuation starts with the customer-facing answer.
        sanitized_messages.append({'role': 'assistant', 'content': '<think>\n</think>\n'})

    payload = {
        'model': chosen_model,
        'messages': sanitized_messages,
        'stream': False,
        'keep_alive': getattr(settings, 'OLLAMA_KEEP_ALIVE', '15m'),
        'options': {
            'temperature': getattr(settings, 'OLLAMA_TEMPERATURE', 0.3),
            'repeat_penalty': 1.25,
            'num_predict': max_tokens,
            'num_ctx': getattr(settings, 'OLLAMA_CONTEXT_WINDOW', 2048),
        },
    }

    # Qwen3 spends time in a reasoning phase by default.  This assistant only
    # needs concise catalog/support answers, so request direct answers instead.
    if disable_thinking:
        payload['think'] = False
        # Used by current llama.cpp chat templates. Unknown fields are safely
        # ignored by native Ollama, so this keeps both server types compatible.
        payload['chat_template_kwargs'] = {'enable_thinking': False}

    if response_format:
        payload['format'] = response_format

    request = Request(
        f'{base_url}/api/chat',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urlopen(request, timeout=getattr(settings, 'OLLAMA_TIMEOUT_SECONDS', 180)) as response:
            data = json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        err_msg = str(exc)
        try:
            err_raw = exc.read().decode('utf-8')
            err_body = json.loads(err_raw)
            if isinstance(err_body.get('error'), dict):
                err_msg = err_body['error'].get('message', str(exc))
            else:
                err_msg = err_body.get('error', str(exc))
        except Exception:
            pass

        raise OllamaUnavailable(f'Ollama model error: {err_msg}') from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        if not available:
            raise OllamaUnavailable('Ollama server is starting or downloading model. Please wait a moment...') from exc
        raise OllamaUnavailable('Ollama is not available. Please verify Ollama is running.') from exc

    content = data.get('message', {}).get('content')
    if not content:
        raise OllamaUnavailable('Ollama returned an empty response.')
    # Some llama.cpp builds include the assistant prefill in their returned
    # content. Never expose that control marker in the customer UI.
    if '</think>' in content:
        content = content.split('</think>', 1)[1].strip()
    # Strip leaked internal reasoning that smaller models sometimes emit
    # without proper </think> tags.
    content = _strip_reasoning(content)
    if not content:
        raise OllamaUnavailable('Ollama returned an empty response.')
    return content


def image_to_base64(uploaded_file):
    """Validate, auto-convert any format (AVIF, WEBP, PNG, HEIC) to standard JPEG, resize if large, and encode to base64."""
    if uploaded_file.size > getattr(settings, 'AI_ASSISTANT_MAX_IMAGE_BYTES', 12 * 1024 * 1024):
        raise ValueError('Image must be 12 MB or smaller.')

    try:
        image = Image.open(uploaded_file)
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Resize image if dimensions exceed 1024px for ultra-fast vision processing
        max_dim = 1024
        if max(image.size) > max_dim:
            image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('ascii')
    except Exception:
        try:
            uploaded_file.seek(0)
            return base64.b64encode(uploaded_file.read()).decode('ascii')
        except Exception:
            raise ValueError('Could not process the uploaded image file.')
