import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import BannerPublicitarioModel

class BannersPublicosController(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        banners = BannerPublicitarioModel.objects.filter(activo=True).order_by('-fecha_creacion')
        datos = [
            {
                'id': b.id,
                'titulo': b.titulo,
                'imagen_url': b.imagen_url,
                'link_url': b.link_url,
                'activo': b.activo
            } for b in banners
        ]
        return Response({'ok': True, 'datos': datos}, status=200)

class BannersAdminController(APIView):
    permission_classes = [IsAuthenticated]
    
    def _is_superadmin(self, request):
        # El rol viene en el request.user desde el middleware/JWT de autenticacion
        return getattr(request.user, 'rol', None) == 'superadmin'

    def get(self, request):
        if not self._is_superadmin(request):
            return Response({'ok': False, 'error': 'Acceso denegado'}, status=403)
            
        banners = BannerPublicitarioModel.objects.all().order_by('-fecha_creacion')
        datos = [
            {
                'id': b.id,
                'titulo': b.titulo,
                'imagen_url': b.imagen_url,
                'link_url': b.link_url,
                'activo': b.activo,
                'fecha_creacion': b.fecha_creacion.isoformat()
            } for b in banners
        ]
        return Response({'ok': True, 'datos': datos}, status=200)

    def post(self, request):
        if not self._is_superadmin(request):
            return Response({'ok': False, 'error': 'Acceso denegado'}, status=403)
            
        data = request.data
        nuevo_id = str(uuid.uuid4())
        
        try:
            banner = BannerPublicitarioModel.objects.create(
                id=nuevo_id,
                titulo=data.get('titulo', ''),
                imagen_url=data.get('imagen_url', ''),
                link_url=data.get('link_url', ''),
                activo=data.get('activo', True)
            )
            return Response({'ok': True, 'mensaje': 'Banner creado', 'id': banner.id}, status=201)
        except Exception as e:
            return Response({'ok': False, 'error': str(e)}, status=400)

    def put(self, request, banner_id):
        if not self._is_superadmin(request):
            return Response({'ok': False, 'error': 'Acceso denegado'}, status=403)
            
        try:
            banner = BannerPublicitarioModel.objects.get(id=banner_id)
            data = request.data
            
            if 'titulo' in data: banner.titulo = data['titulo']
            if 'imagen_url' in data: banner.imagen_url = data['imagen_url']
            if 'link_url' in data: banner.link_url = data['link_url']
            if 'activo' in data: banner.activo = data['activo']
            
            banner.save()
            return Response({'ok': True, 'mensaje': 'Banner actualizado'})
        except BannerPublicitarioModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Banner no encontrado'}, status=404)
        except Exception as e:
            return Response({'ok': False, 'error': str(e)}, status=400)

    def delete(self, request, banner_id):
        if not self._is_superadmin(request):
            return Response({'ok': False, 'error': 'Acceso denegado'}, status=403)
            
        try:
            BannerPublicitarioModel.objects.get(id=banner_id).delete()
            return Response({'ok': True, 'mensaje': 'Banner eliminado'})
        except BannerPublicitarioModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Banner no encontrado'}, status=404)
