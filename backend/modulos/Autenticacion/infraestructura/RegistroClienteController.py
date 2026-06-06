"""
RegistroClienteController.py — Endpoint público para que usuarios finales (clientes)
se registren en la plataforma para poder reservar citas.

Endpoint: POST /api/auth/registro-cliente/
- AllowAny (público, sin token)
- Crea credencial con rol='cliente'
- Devuelve JWT directamente para auto-login
- NO permite crear cuentas con rol 'empresa' o 'superadmin'
"""
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from modulos.Autenticacion.dominio.Entidades import Credencial
from modulos.Autenticacion.dominio.ValueObjects import PasswordHash
from .DjangoAutenticacionRepository import DjangoAutenticacionRepository
from .DjangoPasswordHasher import DjangoPasswordHasher
from .models import CredencialModel


class RegistroClienteThrottle(AnonRateThrottle):
    """Máximo 10 registros de cliente por hora por IP."""
    scope = 'registro_cliente'


class RegistroClienteController(APIView):
    """
    Registro público de clientes finales (usuarios que reservan servicios).
    Al registrarse exitosamente, retorna tokens JWT para auto-login inmediato.
    """
    permission_classes = [AllowAny]
    throttle_classes = [RegistroClienteThrottle]

    def post(self, request):
        nombre = request.data.get('nombre', '').strip()
        email = request.data.get('email', '').strip().lower()
        telefono = request.data.get('telefono', '').strip()
        password = request.data.get('password', '')

        # Validaciones básicas
        if not all([nombre, email, password]):
            return Response(
                {'ok': False, 'error': 'nombre, email y password son obligatorios.'},
                status=400
            )

        if len(password) < 6:
            return Response(
                {'ok': False, 'error': 'La contraseña debe tener al menos 6 caracteres.'},
                status=400
            )

        # Verificar que no exista ya ese email
        if CredencialModel.objects.filter(email=email).exists():
            return Response(
                {'ok': False, 'error': 'Ya existe una cuenta con ese email.'},
                status=409
            )

        # Crear credencial con rol='cliente' (NUNCA empresa/superadmin)
        usuario_id = str(uuid.uuid4())
        hasher = DjangoPasswordHasher()
        password_hash = hasher.hash(password)

        repo = DjangoAutenticacionRepository()
        credencial = Credencial(
            usuario_id=usuario_id,
            username=email,    # username = email para clientes
            email=email,
            password_hash=PasswordHash(value=password_hash),
            activo=True,
            rol='cliente',     # Rol fijo — no se puede cambiar por este endpoint
        )
        repo.guardar_credencial(credencial)

        # Generar JWT automáticamente (auto-login)
        # Creamos un objeto compatible con SimpleJWT usando un dict-like wrapper
        token_data = _generar_tokens(usuario_id, email, 'cliente', nombre)

        return Response({
            'ok': True,
            'mensaje': 'Cuenta creada correctamente.',
            'datos': {
                'usuario_id': usuario_id,
                'nombre': nombre,
                'email': email,
                'telefono': telefono,
                'rol': 'cliente',
            },
            **token_data,
        }, status=201)


def _generar_tokens(usuario_id: str, email: str, rol: str, nombre: str) -> dict:
    """
    Genera tokens usando el mismo patrón que LoginController:
    RefreshToken() bare con claims personalizados.
    """
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken()
    refresh['user_id'] = usuario_id
    refresh['email'] = email
    refresh['rol'] = rol
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }
