from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import EmpresaModel, NoticiaModel

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
