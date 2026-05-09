from django.urls import path
from .AutenticacionController import LoginController
from .RegistroController import RegistroController

urlpatterns = [
    path('login/', LoginController.as_view(), name='auth_login'),
    path('register/', RegistroController.as_view(), name='auth_register'),
]
