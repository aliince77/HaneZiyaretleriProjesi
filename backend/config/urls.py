from django.contrib import admin
from django.conf import settings
from django.http import Http404
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('households.urls')),
]


def serve_media(request, path):
    if not settings.DEBUG and not settings.SYDV_SERVE_MEDIA:
        raise Http404
    return serve(request, path, document_root=settings.MEDIA_ROOT)


urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve_media),
]
