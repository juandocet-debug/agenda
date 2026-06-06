import os
import uuid
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from modulos.Autenticacion.dominio.Entidades import Credencial
from modulos.Autenticacion.dominio.ValueObjects import PasswordHash
from .DjangoAutenticacionRepository import DjangoAutenticacionRepository
from .models import CredencialModel
from .RegistroClienteController import _generar_tokens

_GOOGLE_CLIENT_ID = os.environ.get('EXPO_PUBLIC_GOOGLE_CLIENT_ID', '')

class GoogleAuthController(APIView):
    """
    Recibe un token de Google, lo valida, y crea o inicia sesión para un cliente.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'ok': False, 'error': 'Token no proporcionado.'}, status=400)

        # Validar el id_token con Google (timeout 5s para no bloquear workers)
        google_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        res = requests.get(google_url, timeout=5)

        if res.status_code != 200:
            # Fallback: access_token en lugar de id_token
            res = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={'Authorization': f'Bearer {token}'},
                timeout=5,
            )
            if res.status_code != 200:
                return Response({'ok': False, 'error': 'Token de Google inválido.'}, status=401)
        else:
            # Verificar que el token fue emitido para esta aplicación (previene cross-app token substitution)
            data_check = res.json()
            token_aud = data_check.get('aud', '')
            if _GOOGLE_CLIENT_ID and token_aud != _GOOGLE_CLIENT_ID:
                return Response({'ok': False, 'error': 'Token de Google inválido.'}, status=401)

        data = res.json()
        email = data.get('email')
        nombre = data.get('name', 'Usuario Google')

        if not email:
            return Response({'ok': False, 'error': 'No se pudo obtener el email de Google.'}, status=400)

        email = email.lower()

        # Verificar si existe el usuario
        repo = DjangoAutenticacionRepository()
        try:
            # Buscar en DB
            usuario_existente = CredencialModel.objects.get(email=email)
            usuario_id = usuario_existente.usuario_id
            rol = usuario_existente.rol
        except CredencialModel.DoesNotExist:
            # Crear cuenta de cliente
            usuario_id = str(uuid.uuid4())
            # Guardamos un password ficticio
            password_hash = "google-oauth2-no-password" 
            
            credencial = Credencial(
                usuario_id=usuario_id,
                username=email,
                email=email,
                password_hash=PasswordHash(value=password_hash),
                activo=True,
                rol='cliente',
            )
            repo.guardar_credencial(credencial)
            rol = 'cliente'

        token_data = _generar_tokens(usuario_id, email, rol, nombre)

        return Response({
            'ok': True,
            'mensaje': 'Autenticación con Google exitosa.',
            'datos': {
                'usuario_id': usuario_id,
                'nombre': nombre,
                'email': email,
                'rol': rol,
            },
            **token_data,
        }, status=200)
