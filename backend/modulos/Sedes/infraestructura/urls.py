from django.urls import path
from .SedeController import SedesPublicasController, SedesController, SedeDetalleController

urlpatterns = [
    # Público
    path('publicas/', SedesPublicasController.as_view()),
    # Privado (empresa autenticada)
    path('', SedesController.as_view()),
    path('<str:sede_id>/', SedeDetalleController.as_view()),
]
