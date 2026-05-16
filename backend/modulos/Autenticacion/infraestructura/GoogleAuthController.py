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

class GoogleAuthController(APIView):
    """
    Recibe un token de Google, lo valida, y crea o inicia sesión para un cliente.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'ok': False, 'error': 'Token no proporcionado.'}, status=400)

        # Validar el token con Google
        google_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        res = requests.get(google_url)
        
        if res.status_code != 200:
            # Ocurre cuando se envía un access_token en lugar de un id_token
            google_url_access = f"https://www.googleapis.com/oauth2/v3/userinfo"
            headers = {'Authorization': f'Bearer {token}'}
            res = requests.get(google_url_access, headers=headers)
            
            if res.status_code != 200:
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
