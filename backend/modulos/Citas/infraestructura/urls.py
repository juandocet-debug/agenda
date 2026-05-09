from django.urls import path
from .CitaController import AgendarCitaController

urlpatterns = [
    path('agendar/', AgendarCitaController.as_view(), name='agendar_cita'),
]
