from django.urls import path
from .PublicacionController import (
    CrearPublicacionController, ListarPublicacionesController, EliminarPublicacionController,
    LikeController, ComentariosController, EliminarComentarioController,
    LikeComentarioController,
)

urlpatterns = [
    path('crear/', CrearPublicacionController.as_view(), name='crear_publicacion'),
    path('empresa/<str:empresa_id>/', ListarPublicacionesController.as_view(), name='listar_publicaciones'),
    path('<str:publicacion_id>/eliminar/', EliminarPublicacionController.as_view(), name='eliminar_publicacion'),
    path('<str:publicacion_id>/like/', LikeController.as_view(), name='like_publicacion'),
    path('<str:publicacion_id>/comentarios/', ComentariosController.as_view(), name='comentarios_publicacion'),
    path('comentarios/<str:comentario_id>/eliminar/', EliminarComentarioController.as_view(), name='eliminar_comentario'),
    path('comentarios/<str:comentario_id>/like/', LikeComentarioController.as_view(), name='like_comentario'),
]
