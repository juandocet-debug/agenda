from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .DjangoAutenticacionRepository import DjangoAutenticacionRepository
from .DjangoPasswordHasher import DjangoPasswordHasher
from .models import CredencialModel
import uuid

class CrearSuperAdminController(APIView):
    """
    ENDPOINT TEMPORAL SOLO PARA DEMO.
    Crea el usuario superadmin si no existe.
    ELIMINAR DESPUÉS DE LA DEMO.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        secret = request.data.get('secret')
        if secret != 'flowy-demo-2026':
            return Response({'ok': False, 'error': 'No autorizado'}, status=403)

        email = request.data.get('email', 'admin@flowy.com')
        password = request.data.get('password', 'Flowy2026')
        rol = request.data.get('rol', 'superadmin')

        hasher = DjangoPasswordHasher()
        hashed = hasher.hash(password)

        existing = CredencialModel.objects.filter(email=email).first()
        if existing:
            existing.password_hash = hashed
            existing.activo = True
            existing.rol = rol
            existing.save()
            action = 'actualizado'
        else:
            CredencialModel.objects.create(
                usuario_id=str(uuid.uuid4()),
                username=email.split('@')[0],
                email=email,
                password_hash=hashed,
                activo=True,
                rol=rol
            )
            action = 'creado'

        return Response({
            'ok': True,
            'mensaje': f'Usuario {action}: {email} / {password} con rol={rol}',
            'usuarios': [
                {'email': u.email, 'rol': u.rol, 'activo': u.activo}
                for u in CredencialModel.objects.all()
            ]
        })

    def get(self, request):
        """Ver usuarios existentes (solo para debug demo)"""
        return Response({
            'usuarios': [
                {'email': u.email, 'rol': u.rol, 'activo': u.activo}
                for u in CredencialModel.objects.all()
            ]
        })
