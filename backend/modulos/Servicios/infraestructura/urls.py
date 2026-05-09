from django.urls import path
from .ServicioController import ServicioController

urlpatterns = [
    path('', ServicioController.as_view(), name='gestion_servicios'),
]
