from django.urls import path
from .PagoController import PagoController

urlpatterns = [
    # Ej: /api/pagos/citas/1234/
    path('citas/<str:cita_id>/', PagoController.as_view(), name='gestion_pagos'),
]
