from django.urls import path
from .ServicioController import ServicioController, ActualizarServicioController

urlpatterns = [
    path('', ServicioController.as_view(), name='gestion_servicios'),
    path('<str:servicio_id>/', ActualizarServicioController.as_view(), name='actualizar_servicio'),
]
