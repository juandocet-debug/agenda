import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

from .DjangoAutenticacionRepository import DjangoAutenticacionRepository
from .DjangoPasswordHasher import DjangoPasswordHasher
from modulos.Autenticacion.aplicacion.IniciarSesion.IniciarSesion import IniciarSesion

class LoginController(APIView):
    permission_classes = [AllowAny] # El login debe ser público

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'ok': False, 'error': 'Email y password requeridos'}, status=400)

        repo = DjangoAutenticacionRepository()
        hasher = DjangoPasswordHasher()
        caso_uso = IniciarSesion(repo=repo, hasher=hasher)

        try:
            usuario_id, rol = caso_uso.run(identificador=email, password_plano=password)
            logger.info("Login exitoso: usuario_id=%s rol=%s", usuario_id, rol)
            
            # Generar JWT con claims personalizados (usuario_id + rol)
            refresh = RefreshToken()
            refresh['user_id'] = usuario_id
            refresh['email'] = email
            refresh['rol'] = rol
            
            return Response({
                'ok': True,
                'datos': {
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'usuario_id': usuario_id,
                    'rol': rol
                }
            }, status=200)

        except ValueError as e:
            logger.warning("Login fallido (credenciales inválidas): %s", e)
            return Response({'ok': False, 'error': str(e)}, status=401)
        except Exception as e:
            logger.exception("Error inesperado en login")
            return Response({'ok': False, 'error': f"Error interno: {str(e)}"}, status=500)
