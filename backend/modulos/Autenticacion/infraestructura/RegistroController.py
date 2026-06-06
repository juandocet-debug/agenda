import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

from .DjangoAutenticacionRepository import DjangoAutenticacionRepository
from .DjangoPasswordHasher import DjangoPasswordHasher
from modulos.Autenticacion.aplicacion.RegistroAutonomo.RegistrarEmpresaUseCase import RegistrarEmpresaUseCase

class RegistroController(APIView):
    permission_classes = [AllowAny] # Registro pblico

    def post(self, request):
        nombre_empresa = request.data.get('nombre_empresa')
        email = request.data.get('email')
        username = request.data.get('username')
        password = request.data.get('password')

        if not all([nombre_empresa, email, username, password]):
            return Response({'ok': False, 'error': 'Faltan datos requeridos'}, status=400)

        repo = DjangoAutenticacionRepository()
        hasher = DjangoPasswordHasher()
        caso_uso = RegistrarEmpresaUseCase(repo_auth=repo, hasher=hasher)

        try:
            nuevo_id = caso_uso.run(
                nombre_empresa=nombre_empresa, 
                email=email, 
                username=username, 
                password_plano=password
            )
            return Response({'ok': True, 'mensaje': 'Empresa registrada con xito', 'id': nuevo_id}, status=201)
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.exception("[Registro] Error interno")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)
