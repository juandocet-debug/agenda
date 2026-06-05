from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import EmpresaModel, NoticiaModel

class ListaEmpresasPublicasController(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from modulos.Empresas.aplicacion.ObtenerEmpresasPublicasUseCase import ObtenerEmpresasPublicasUseCase
        from .DjangoEmpresaRepository import DjangoEmpresaRepository
        
        repositorio = DjangoEmpresaRepository()
        caso_uso = ObtenerEmpresasPublicasUseCase(repositorio)
        
        # El caso de uso devuelve directamente el diccionario paginado
        datos_paginados = caso_uso.ejecutar(request)
        
        return Response({'ok': True, 'datos': datos_paginados}, status=200)


class EmpresaVisualConfigController(APIView):
    permission_classes = [AllowAny]
    """
    Endpoint público para que el Frontend (App/Web) consulte 
    los colores, el logo y las noticias de la empresa usando su slug.
    """
    def get(self, request, slug):
        try:
            empresa = EmpresaModel.objects.get(slug=slug)
            
            # Obtener últimas 5 noticias de esta empresa para mostrar en el feed público
            noticias_queryset = NoticiaModel.objects.filter(empresa=empresa).order_by('-fecha_publicacion')[:5]
            noticias = [
                {
                    "id": n.id,
                    "titulo": n.titulo,
                    "contenido": n.contenido,
                    "fecha": n.fecha_publicacion.isoformat()
                } for n in noticias_queryset
            ]
            
            return Response({
                'ok': True,
                'datos': {
                    'empresa_id': empresa.id,
                    'nombre': empresa.nombre,
                    'configuracion_visual': {
                        'logo_url': empresa.logo_url,
                        'color_primario': empresa.color_primario,
                        'color_secundario': empresa.color_secundario
                    },
                    'noticias_recientes': noticias
                }
            }, status=200)
            
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada en la plataforma.'}, status=404)

class PerfilPublicoEmpresaController(APIView):
    permission_classes = [AllowAny]
    """
    Endpoint público para consultar datos básicos de una empresa por ID.
    """
    def get(self, request, empresa_id):
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            return Response({
                'ok': True,
                'datos': {
                    'empresa_id': empresa.id,
                    'nombre_empresa': empresa.nombre,
                    'logo_url': empresa.logo_url,
                    'mensaje_advertencia': empresa.mensaje_advertencia
                }
            }, status=200)
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada.'}, status=404)

from rest_framework.permissions import IsAuthenticated

class DetalleEmpresaPrivadoController(APIView):
    permission_classes = [IsAuthenticated]
    """
    Endpoint privado para consultar todos los datos de la empresa (para edición).
    El usuario debe estar autenticado.
    """
    def get(self, request, empresa_id):
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            return Response({
                'ok': True,
                'datos': {
                    'id': empresa.id,
                    'nombre': empresa.nombre,
                    'slug': empresa.slug,
                    'ciudad': getattr(empresa, 'ciudad', ''),
                    'pais': getattr(empresa, 'pais', ''),
                    'direccion': getattr(empresa, 'direccion', ''),
                    'telefono': getattr(empresa, 'telefono', ''),
                    'correo_contacto': getattr(empresa, 'correo_contacto', ''),
                    'moneda': getattr(empresa, 'moneda', 'COP'),
                    'logo_url': getattr(empresa, 'logo_url', ''),
                    'wompi_public_key': getattr(empresa, 'wompi_public_key', ''),
                    'wompi_integrity_key': getattr(empresa, 'wompi_integrity_key', ''),
                    'wompi_events_secret': getattr(empresa, 'wompi_events_secret', ''),
                    'mensaje_advertencia': getattr(empresa, 'mensaje_advertencia', ''),
                    'categoria_id': str(empresa.categoria_id) if empresa.categoria_id else None,
                    'categoria_nombre': empresa.categoria.nombre if empresa.categoria_id else '',
                }
            }, status=200)
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada.'}, status=404)

class ConfigurarWompiController(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, empresa_id):
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            # Validar que el usuario que hace la peticion pertenezca a esta empresa (omitido en MVP simplificado)
            
            data = request.data
            empresa.wompi_public_key = data.get('wompi_public_key', empresa.wompi_public_key)
            empresa.wompi_integrity_key = data.get('wompi_integrity_key', empresa.wompi_integrity_key)
            empresa.wompi_events_secret = data.get('wompi_events_secret', empresa.wompi_events_secret)
            empresa.save()
            
            return Response({'ok': True, 'mensaje': 'Llaves de Wompi actualizadas correctamente.'})
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada.'}, status=404)
