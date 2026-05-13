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
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListarPublicacionesController(APIView):
    permission_classes = [AllowAny]

    def get(self, request, empresa_id):
        try:
            limit = int(request.query_params.get('limit', 10))
            offset = int(request.query_params.get('offset', 0))

            # Obtenemos usuario_id del token si está autenticado (para saber si dio like)
            usuario_id = None
            if request.user and request.user.is_authenticated:
                usuario_id = str(request.user.usuario_id)

            repo = DjangoPublicacionRepository()
            publicaciones = ListarPublicacionesUseCase(repo).ejecutar(empresa_id, usuario_id, limit, offset)
            return Response({"ok": True, "datos": [p.dict() for p in publicaciones]})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComentariosController(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, publicacion_id):
        """Listar comentarios de una publicación (puede ser público opcionalmente)."""
        try:
            repo = DjangoPublicacionRepository()
            comentarios = ListarComentariosUseCase(repo).ejecutar(publicacion_id)
            return Response({"ok": True, "datos": [c.dict() for c in comentarios]})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, publicacion_id):
        """Agregar un comentario."""
        try:
            usuario_id = str(request.user.usuario_id)
            rol = getattr(request.user, 'rol', 'cliente')
            
            from .models import PublicacionModel
            try:
                pub = PublicacionModel.objects.get(id=publicacion_id)
                if rol == 'empresa' and str(pub.empresa_id) != usuario_id:
                    return Response({"ok": False, "error": "Como empresa solo puedes comentar en tus propias publicaciones (anti-spam/hate)."}, status=status.HTTP_403_FORBIDDEN)
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
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LikeComentarioController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, comentario_id):
        try:
            usuario_id = str(request.user.usuario_id)
            repo = DjangoPublicacionRepository()
            resultado = DarLikeComentarioUseCase(repo).ejecutar(comentario_id, usuario_id)
            return Response({"ok": True, "datos": resultado})
        except Exception as e:
            return Response({"ok": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

