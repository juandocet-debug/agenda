from django.urls import path
from .ProfesionalController import CrearProfesionalController, ListarProfesionalesController, ActualizarProfesionalController, ProfesionalPublicoController

urlpatterns = [
    path('crear/', CrearProfesionalController.as_view(), name='crear_profesional'),
    path('lista/', ListarProfesionalesController.as_view(), name='listar_profesionales'),
    path('<str:profesional_id>/actualizar/', ActualizarProfesionalController.as_view(), name='actualizar_profesional'),
    path('publico/<str:empresa_id>/', ProfesionalPublicoController.as_view(), name='profesionales_publico'),
]
