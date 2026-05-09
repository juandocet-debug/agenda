from django.urls import path
from .ProfesionalController import CrearProfesionalController, ListarProfesionalesController

urlpatterns = [
    path('crear/', CrearProfesionalController.as_view(), name='crear_profesional'),
    path('lista/', ListarProfesionalesController.as_view(), name='listar_profesionales'),
]
