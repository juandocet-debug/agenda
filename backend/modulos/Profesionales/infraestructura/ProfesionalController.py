from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .DjangoProfesionalRepository import DjangoProfesionalRepository
from ..aplicacion.CrearProfesional import CrearProfesionalUseCase
from ..aplicacion.ListarProfesionales import ListarProfesionalesUseCase

class CrearProfesionalController(APIView):
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repositorio = DjangoProfesionalRepository()
        self.crear_use_case = CrearProfesionalUseCase(self.repositorio)

    def post(self, request):
        try:
            # En la autenticación actual, el JWT guarda el ID de credencial en user_id.
            # Como la Credencial se crea con el mismo ID de la Empresa (durante RegistroAutonomo), 
            # el user_id del token es de hecho el empresa_id.
            empresa_id = str(request.user.usuario_id) # request.user mapeado al modelo Credencial
            rol = getattr(request.user, 'rol', 'empresa')
            
            # TODO: Idealmente validar que sólo rol 'empresa' (o superadmin) pueda hacer esto
            if rol != 'empresa' and rol != 'superadmin':
                return Response({"ok": False, "error": "No tienes permisos para crear profesionales."}, status=status.HTTP_403_FORBIDDEN)

            datos = request.data
            profesional = self.crear_use_case.ejecutar(empresa_id, datos)

            return Response({
                "ok": True,
                "mensaje": "Profesional creado correctamente",
                "datos": profesional.dict()
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ListarProfesionalesController(APIView):
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repositorio = DjangoProfesionalRepository()
        self.listar_use_case = ListarProfesionalesUseCase(self.repositorio)

    def get(self, request):
        try:
            empresa_id = str(request.user.usuario_id)
            rol = getattr(request.user, 'rol', 'empresa')
            
            if rol != 'empresa' and rol != 'superadmin':
                return Response({"ok": False, "error": "No tienes permisos."}, status=status.HTTP_403_FORBIDDEN)

            profesionales = self.listar_use_case.ejecutar(empresa_id)
            
            return Response({
                "ok": True,
                "datos": [p.dict() for p in profesionales]
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
