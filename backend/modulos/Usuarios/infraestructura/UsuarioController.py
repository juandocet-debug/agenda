from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .DjangoUsuarioRepository import DjangoUsuarioRepository
from modulos.Usuarios.aplicacion.RegistrarUsuario.RegistrarUsuario import RegistrarUsuario

class UsuarioController(APIView):
    permission_classes = [IsAuthenticated]

    def _verificar_ownership(self, request, empresa_id):
        rol = getattr(request.user, 'rol', '')
        if rol == 'superadmin':
            return True
        return str(request.user.usuario_id) == str(empresa_id)

    def post(self, request):
        data = request.data
        try:
            empresa_id = data.get('empresa_id')
            nombre = data.get('nombre')
            email = data.get('email')
            rol = data.get('rol')
            telefono = data.get('telefono')

            if not all([empresa_id, nombre, email, rol]):
                return Response({'ok': False, 'error': 'Faltan datos (empresa_id, nombre, email, rol)'}, status=400)

            if not self._verificar_ownership(request, empresa_id):
                return Response({'ok': False, 'error': 'Sin permisos para crear usuarios en esta empresa.'}, status=403)

            repo = DjangoUsuarioRepository()
            caso_uso = RegistrarUsuario(usuario_repository=repo)

            usuario = caso_uso.run(
                empresa_id=empresa_id,
                nombre=nombre,
                email_str=email,
                rol_str=rol,
                telefono=telefono
            )

            return Response({'ok': True, 'datos': {'usuario_id': usuario.id}}, status=201)

        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)

    def get(self, request):
        empresa_id = request.query_params.get('empresa_id')
        if not empresa_id:
            return Response({'ok': False, 'error': 'empresa_id es requerido'}, status=400)

        if not self._verificar_ownership(request, empresa_id):
            return Response({'ok': False, 'error': 'Sin permisos para listar usuarios de esta empresa.'}, status=403)

        repo = DjangoUsuarioRepository()
        usuarios = repo.listar_por_empresa(empresa_id)

        datos = [{
            'id': u.id,
            'nombre': u.nombre,
            'email': u.email.value,
            'rol': u.rol.value,
            'activo': u.activo
        } for u in usuarios]

        return Response({'ok': True, 'datos': datos}, status=200)
