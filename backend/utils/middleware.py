"""NotePlate Middleware"""
import logging
import time

logger = logging.getLogger('apps')


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        duration = time.time() - start
        if request.path.startswith('/api/') and duration > 1.0:
            logger.warning(f'SLOW {request.method} {request.path} {response.status_code} {duration:.2f}s')
        return response
