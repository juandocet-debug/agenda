from django.urls import path
from .UsuarioController import UsuarioController

urlpatterns = [
    path('', UsuarioController.as_view(), name='gestion_usuarios'),
]
