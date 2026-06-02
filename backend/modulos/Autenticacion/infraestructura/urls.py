from django.urls import path
from .AutenticacionController import LoginController
from .RegistroController import RegistroController
from .RegistroClienteController import RegistroClienteController
from .GoogleAuthController import GoogleAuthController
from .CrearSuperAdminController import CrearSuperAdminController
from .RecuperarPasswordController import SolicitarRecuperacionController, RestablecerPasswordController

urlpatterns = [
    path('login/', LoginController.as_view(), name='auth_login'),
    path('register/', RegistroController.as_view(), name='auth_register'),
    # Registro público para clientes finales (usuarios que reservan citas)
    path('registro-cliente/', RegistroClienteController.as_view(), name='auth_registro_cliente'),
    path('google/', GoogleAuthController.as_view(), name='auth_google'),
    # Recuperación de contraseña (AllowAny — sin JWT)
    path('recuperar-password/', SolicitarRecuperacionController.as_view(), name='auth_recuperar_password'),
    path('reset-password/', RestablecerPasswordController.as_view(), name='auth_reset_password'),
    # TEMP DEMO: crear superadmin en producción — ELIMINAR POST-DEMO
    path('setup-admin/', CrearSuperAdminController.as_view(), name='auth_setup_admin'),
]
