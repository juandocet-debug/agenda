from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken

from .UpgradeToEmpresaUseCase import UpgradeToEmpresaUseCase
from modulos.Usuarios.infraestructura.models import UsuarioModel

class UpgradeToEmpresaController(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.use_case = UpgradeToEmpresaUseCase()

    def post(self, request):
        usuario_id = request.user.id
        nombre_empresa = request.data.get("nombre")
        nit = request.data.get("nit")
        rut_archivo = request.FILES.get("rut_archivo")

        if not nombre_empresa or not nit:
            return Response(
                {"error": "El nombre de la empresa y el NIT son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            self.use_case.run(
                usuario_id=usuario_id,
                nombre_empresa=nombre_empresa,
                nit=nit,
                rut_archivo=rut_archivo
            )

            # Una vez actualizado el rol a empresa, necesitamos emitir un nuevo JWT
            # para que el frontend tenga el rol actualizado sin pedir re-login
            usuario = UsuarioModel.objects.get(id=usuario_id)
            refresh = RefreshToken.for_user(usuario)
            
            # Custom claims
            refresh['username'] = usuario.username
            refresh['rol'] = usuario.rol

            return Response({
                "mensaje": "Empresa registrada exitosamente",
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Error interno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
