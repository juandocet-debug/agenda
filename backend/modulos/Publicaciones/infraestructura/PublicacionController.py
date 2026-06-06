import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .DjangoPublicacionRepository import DjangoPublicacionRepository
from ..aplicacion.CrearPublicacion import CrearPublicacionUseCase
from ..aplicacion.ListarPublicaciones import ListarPublicacionesUseCase
from ..aplicacion.Interacciones import (
    DarLikeUseCase, AgregarComentarioUseCase,
    ListarComentariosUseCase, EliminarComentarioUseCase,
    DarLikeComentarioUseCase,
)

logger = logging.getLogger(__name__)


class UploadImagenPublicacionController(APIView):
    """
    Recibe un archivo de imagen (multipart/form-data, campo 'imagen'),
    lo sube directamente a Cloudinary y devuelve la URL pública.
    El frontend almacena solo esa URL — nunca base64 en la BD.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            archivo = request.FILES.get('imagen')
            if not archivo:
                return Response({"ok": False, "error": "No se recibió ninguna imagen."}, status=status.HTTP_400_BAD_REQUEST)

            tipos_permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            if archivo.content_type not in tipos_permitidos:
                return Response({"ok": False, "error": "Tipo de archivo no permitido."}, status=status.HTTP_400_BAD_REQUEST)

            if archivo.size > 8 * 1024 * 1024:
                return Response({"ok": False, "error": "La imagen no puede superar 8MB."}, status=status.HTTP_400_BAD_REQUEST)

            from django.conf import settings as django_settings
            import cloudinary.uploader
            _folder = 'agenda/dev/publicaciones' if django_settings.DEBUG else 'agenda/publicaciones'
            resultado = cloudinary.uploader.upload(
                archivo,
                folder=_folder,
                transformation=[
                    {'width': 1080, 'crop': 'limit', 'quality': 'auto:good', 'fetch_format': 'auto'}
                ],
            )
            url = resultado.get('secure_url')
            if not url:
                raise Exception("Cloudinary no devolvió una URL.")

            return Response({"ok": True, "url": url}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("[UploadImagenPublicacion] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CrearPublicacionController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            empresa_id = str(request.user.usuario_id)
            rol = getattr(request.user, 'rol', 'empresa')
            if rol not in ('empresa', 'superadmin'):
                return Response({"ok": False, "error": "Sin permisos."}, status=status.HTTP_403_FORBIDDEN)

            repo = DjangoPublicacionRepository()
            publicacion = CrearPublicacionUseCase(repo).ejecutar(empresa_id, request.data)
            return Response({"ok": True, "datos": publicacion.dict()}, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("[CrearPublicacion] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListarPublicacionesController(APIView):
    permission_classes = [AllowAny]

    def get(self, request, empresa_id):
        try:
            limit = int(request.query_params.get('limit', 10))
            offset = int(request.query_params.get('offset', 0))

            usuario_id = None
            if request.user and request.user.is_authenticated:
                usuario_id = str(request.user.usuario_id)

            repo = DjangoPublicacionRepository()
            publicaciones = ListarPublicacionesUseCase(repo).ejecutar(empresa_id, usuario_id, limit, offset)
            return Response({"ok": True, "datos": [p.dict() for p in publicaciones]})
        except Exception as e:
            logger.exception("[ListarPublicaciones] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EliminarPublicacionController(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, publicacion_id):
        try:
            empresa_id = str(request.user.usuario_id)
            repo = DjangoPublicacionRepository()
            publicaciones = repo.obtener_por_empresa(empresa_id)
            if publicacion_id not in [p.id for p in publicaciones]:
                return Response({"ok": False, "error": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
            repo.eliminar(publicacion_id)
            return Response({"ok": True, "mensaje": "Eliminada."})
        except Exception as e:
            logger.exception("[EliminarPublicacion] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- Interacciones ---

class LikeController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, publicacion_id):
        try:
            usuario_id = str(request.user.usuario_id)
            repo = DjangoPublicacionRepository()
            resultado = DarLikeUseCase(repo).ejecutar(publicacion_id, usuario_id)
            return Response({"ok": True, "datos": resultado})
        except Exception as e:
            logger.exception("[LikeController] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComentariosController(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, publicacion_id):
        try:
            repo = DjangoPublicacionRepository()
            comentarios = ListarComentariosUseCase(repo).ejecutar(publicacion_id)
            return Response({"ok": True, "datos": [c.dict() for c in comentarios]})
        except Exception as e:
            logger.exception("[ComentariosController.get] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, publicacion_id):
        try:
            usuario_id = str(request.user.usuario_id)
            rol = getattr(request.user, 'rol', 'cliente')

            from .models import PublicacionModel
            try:
                pub = PublicacionModel.objects.get(id=publicacion_id)
                if rol == 'empresa' and str(pub.empresa_id) != usuario_id:
                    return Response({"ok": False, "error": "Como empresa solo puedes comentar en tus propias publicaciones."}, status=status.HTTP_403_FORBIDDEN)
            except PublicacionModel.DoesNotExist:
                return Response({"ok": False, "error": "Publicación no encontrada."}, status=status.HTTP_404_NOT_FOUND)

            texto = request.data.get('texto', '').strip()
            autor_nombre = request.data.get('autor_nombre', 'Usuario')
            padre_id = request.data.get('padre_id', None)

            repo = DjangoPublicacionRepository()
            comentario = AgregarComentarioUseCase(repo).ejecutar(
                publicacion_id, usuario_id, texto, autor_nombre, padre_id
            )
            return Response({"ok": True, "datos": comentario.dict()}, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("[ComentariosController.post] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EliminarComentarioController(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, comentario_id):
        try:
            usuario_id = str(request.user.usuario_id)
            repo = DjangoPublicacionRepository()
            eliminado = EliminarComentarioUseCase(repo).ejecutar(comentario_id, usuario_id)
            if not eliminado:
                return Response({"ok": False, "error": "No autorizado o no encontrado."}, status=status.HTTP_403_FORBIDDEN)
            return Response({"ok": True, "mensaje": "Comentario eliminado."})
        except Exception as e:
            logger.exception("[EliminarComentario] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LikeComentarioController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, comentario_id):
        try:
            usuario_id = str(request.user.usuario_id)
            repo = DjangoPublicacionRepository()
            resultado = DarLikeComentarioUseCase(repo).ejecutar(comentario_id, usuario_id)
            return Response({"ok": True, "datos": resultado})
        except Exception as e:
            logger.exception("[LikeComentario] Error interno")
            return Response({"ok": False, "error": "Error interno del servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
