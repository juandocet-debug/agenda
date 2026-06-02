"""
RecuperarPasswordController.py — Controlador HTTP para la recuperación de contraseña.

Endpoints:
  POST /api/auth/recuperar-password/   → Solicitar email de recuperación
  POST /api/auth/reset-password/       → Establecer nueva contraseña con token

Seguridad:
  - Ambos endpoints son AllowAny (no requieren JWT)
  - El endpoint de solicitud siempre devuelve 200 (no revela si el email existe)
  - El token es de un solo uso y expira en 30 minutos
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .DjangoAutenticacionRepository import DjangoAutenticacionRepository
from .DjangoPasswordResetRepository import DjangoPasswordResetRepository
from .DjangoPasswordHasher import DjangoPasswordHasher
from .DjangoEmailAdapter import DjangoEmailAdapter
from modulos.Autenticacion.aplicacion.RecuperarPassword.SolicitarRecuperacion import SolicitarRecuperacion
from modulos.Autenticacion.aplicacion.RecuperarPassword.RestablecerPassword import RestablecerPassword


class SolicitarRecuperacionController(APIView):
    """
    POST /api/auth/recuperar-password/
    Body: { "email": "usuario@ejemplo.com" }
    Respuesta: siempre 200 (por seguridad, no revela si el email existe).
    """
    permission_classes = [AllowAny]
    throttle_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response(
                {'ok': False, 'error': 'El campo email es obligatorio.'},
                status=400
            )

        try:
            caso_uso = SolicitarRecuperacion(
                auth_repo=DjangoAutenticacionRepository(),
                reset_repo=DjangoPasswordResetRepository(),
                email_port=DjangoEmailAdapter(),
            )
            caso_uso.run(email)
        except Exception as e:
            # Log interno pero no exponer al cliente (seguridad + UX)
            print(f"[RecuperarPassword] Error interno: {e}")

        # Siempre responder con el mismo mensaje (anti-enumeración de emails)
        return Response({
            'ok': True,
            'mensaje': 'Si existe una cuenta con ese email, recibirás un link de recuperación en los próximos minutos.'
        }, status=200)


class RestablecerPasswordController(APIView):
    """
    POST /api/auth/reset-password/
    Body: { "token": "...", "nueva_password": "..." }
    Respuesta: { ok: true, rol: "empresa"|"cliente"|"superadmin" }
    """
    permission_classes = [AllowAny]
    throttle_classes = []

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        nueva_password = request.data.get('nueva_password', '')

        if not token_str or not nueva_password:
            return Response(
                {'ok': False, 'error': 'Se requieren token y nueva_password.'},
                status=400
            )

        try:
            caso_uso = RestablecerPassword(
                auth_repo=DjangoAutenticacionRepository(),
                reset_repo=DjangoPasswordResetRepository(),
                hasher=DjangoPasswordHasher(),
            )
            rol = caso_uso.run(token_str, nueva_password)
            return Response({
                'ok': True,
                'rol': rol,
                'mensaje': 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
            }, status=200)

        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            print(f"[RestablecerPassword] Error interno: {e}")
            return Response(
                {'ok': False, 'error': 'Error interno del servidor. Intenta de nuevo.'},
                status=500
            )
