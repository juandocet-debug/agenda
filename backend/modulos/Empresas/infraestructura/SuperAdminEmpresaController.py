from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from modulos.Empresas.infraestructura.models import EmpresaModel
from modulos.Autenticacion.infraestructura.models import CredencialModel
# Idealmente la validacion del SuperAdmin (jwt) estaria en un custom permission.
# Para esta prueba, confiaremos en la ruta, o asuminos que tiene un middleware.

class SuperAdminEmpresaController(APIView):
    permission_classes = [AllowAny] 
    
    def get(self, request):
        """Lista todas las empresas registradas para el panel del SuperAdmin."""
        empresas_db = EmpresaModel.objects.all().order_by('-id')
        resultado = []
        
        for empresa in empresas_db:
            # Buscamos su estado activo en la tabla de credenciales usando el ID de la empresa
            # ya que el usuario_id de la credencial es el mismo ID de la empresa (segun el caso de uso)
            try:
                credencial = CredencialModel.objects.get(usuario_id=empresa.id)
                estado_activo = credencial.activo
            except CredencialModel.DoesNotExist:
                estado_activo = False
                
            # Simulamos conteos de momento hasta que existan los modulos de Profesionales y Citas
            resultado.append({
                'id': str(empresa.id),
                'nombre': empresa.nombre,
                'slug': empresa.slug,
                'logo_url': empresa.logo_url,
                'fecha_suscripcion': empresa.fecha_creacion.strftime('%d %b, %Y') if empresa.fecha_creacion else 'N/A',
                'activa': estado_activo,
                'profesionales': 3, 
                'usuarios': 15
            })
            
        return Response({'ok': True, 'datos': resultado}, status=200)

class ActivarEmpresaController(APIView):
    permission_classes = [AllowAny]
    
    def patch(self, request, empresa_id):
        """Activa o desactiva (Suspende) una empresa"""
        nuevo_estado = request.data.get('activo', False)
        
        try:
            credencial = CredencialModel.objects.get(usuario_id=empresa_id)
            credencial.activo = nuevo_estado
            credencial.save()
            return Response({'ok': True, 'mensaje': f"Empresa {'activada' if nuevo_estado else 'suspendida'} exitosamente."})
        except CredencialModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada'}, status=404)

class EliminarEmpresaController(APIView):
    permission_classes = [AllowAny]
    
    def delete(self, request, empresa_id):
        """Elimina permanentemente una empresa y sus credenciales"""
        from modulos.Empresas.aplicacion.EliminarEmpresa.EliminarEmpresaUseCase import EliminarEmpresaUseCase
        from modulos.Empresas.infraestructura.DjangoEmpresaRepository import DjangoEmpresaRepository
        from modulos.Autenticacion.infraestructura.DjangoAutenticacionRepository import DjangoAutenticacionRepository
        
        repo_empresa = DjangoEmpresaRepository()
        repo_auth = DjangoAutenticacionRepository()
        use_case = EliminarEmpresaUseCase(repo_empresa, repo_auth)
        
        try:
            use_case.run(empresa_id)
            return Response({'ok': True, 'mensaje': 'Empresa eliminada exitosamente.'}, status=200)
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=404)
        except Exception as e:
            return Response({'ok': False, 'error': 'Error interno al eliminar la empresa.'}, status=500)
