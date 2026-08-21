from django.conf import settings
from django.shortcuts import render


class HideApiFromBrowserMiddleware:
    """Show a safe permission page for address-bar visits to API URLs.

    Browser navigation normally requests HTML, while the React app requests
    JSON. This keeps API endpoints usable by the app without displaying their
    data, DRF forms, or raw authentication errors to someone opening a URL in
    a browser tab.
    """

    API_PREFIX = '/api/'

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        accepts_html = 'text/html' in request.headers.get('Accept', '')
        is_api_path = request.path == '/api' or request.path.startswith(self.API_PREFIX)
        if request.method in {'GET', 'HEAD'} and is_api_path and accepts_html:
            return render(
                request,
                'index.html',
                {'frontend_url': settings.FRONTEND_URL},
                status=403,
            )
        return self.get_response(request)
