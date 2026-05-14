import uuid
from typing import List, Optional
from django.db.models import Count, Exists, OuterRef, Subquery, IntegerField
from ..dominio.PublicacionRepositoryPort import PublicacionRepositoryPort
from ..dominio.Entidades import Publicacion, Like, Comentario
from .models import PublicacionModel, LikeModel, ComentarioModel, LikeComentarioModel

class DjangoPublicacionRepository(PublicacionRepositoryPort):

    def guardar(self, publicacion: Publicacion) -> Publicacion:
        PublicacionModel.objects.update_or_create(
            id=publicacion.id,
            defaults={
                'empresa_id': publicacion.empresa_id,
                'titulo': publicacion.titulo,
                'descripcion': publicacion.descripcion,
                'imagen_url': publicacion.imagen_url,
                'imagenes': publicacion.imagenes or [],
            }
        )
        return publicacion

    def obtener_por_empresa(self, empresa_id: str, usuario_id: str = None, limit: int = 10, offset: int = 0) -> List[Publicacion]:
        # Obtener publicaciones en una sola query
        qs = list(
            PublicacionModel.objects
            .filter(empresa_id=empresa_id)
            .order_by('-fecha_creacion')[offset:offset + limit]
        )

        if not qs:
            return []

        ids = [m.id for m in qs]

        # Una query para contar likes por publicacion
        likes_qs = (
            LikeModel.objects
            .filter(publicacion_id__in=ids)
            .values('publicacion_id')
            .annotate(total=Count('id'))
        )
        likes_map = {row['publicacion_id']: row['total'] for row in likes_qs}

        # Una query para contar comentarios raíz por publicacion
        comentarios_qs = (
            ComentarioModel.objects
            .filter(publicacion_id__in=ids, padre_id__isnull=True)
            .values('publicacion_id')
            .annotate(total=Count('id'))
        )
        comentarios_map = {row['publicacion_id']: row['total'] for row in comentarios_qs}

        # Una query para saber qué publicaciones le gustaron al usuario
        liked_ids = set()
        if usuario_id:
            liked_ids = set(
                LikeModel.objects
                .filter(publicacion_id__in=ids, usuario_id=usuario_id)
                .values_list('publicacion_id', flat=True)
            )

        return [
            Publicacion(
                id=m.id,
                empresa_id=m.empresa_id,
                titulo=m.titulo,
                descripcion=m.descripcion,
                imagen_url=m.imagen_url,
                imagenes=m.imagenes or ([m.imagen_url] if m.imagen_url else []),
                fecha_creacion=m.fecha_creacion,
                total_likes=likes_map.get(m.id, 0),
                total_comentarios=comentarios_map.get(m.id, 0),
                usuario_dio_like=m.id in liked_ids,
            )
            for m in qs
        ]


    def eliminar(self, id: str) -> bool:
        try:
            PublicacionModel.objects.get(id=id).delete()
            return True
        except PublicacionModel.DoesNotExist:
            return False

    # --- LIKES ---
    def dar_like(self, publicacion_id: str, usuario_id: str) -> bool:
        like, creado = LikeModel.objects.get_or_create(
            publicacion_id=publicacion_id,
            usuario_id=usuario_id,
            defaults={'id': str(uuid.uuid4())}
        )
        if not creado:
            like.delete()  # Toggle: si ya existía, lo quitamos
        return creado

    def contar_likes(self, publicacion_id: str) -> int:
        return LikeModel.objects.filter(publicacion_id=publicacion_id).count()

    def usuario_dio_like(self, publicacion_id: str, usuario_id: str) -> bool:
        return LikeModel.objects.filter(publicacion_id=publicacion_id, usuario_id=usuario_id).exists()

    # --- COMENTARIOS ---
    def agregar_comentario(self, comentario: Comentario) -> Comentario:
        ComentarioModel.objects.create(
            id=comentario.id,
            publicacion_id=comentario.publicacion_id,
            usuario_id=comentario.usuario_id,
            autor_nombre=comentario.autor_nombre,
            texto=comentario.texto,
            padre_id=comentario.padre_id,
        )
        return comentario

    def listar_comentarios(self, publicacion_id: str) -> List[Comentario]:
        raices = ComentarioModel.objects.filter(publicacion_id=publicacion_id, padre_id__isnull=True)
        resultado = []
        for r in raices:
            respuestas_modelos = ComentarioModel.objects.filter(padre_id=r.id)
            respuestas = [self._mapear_comentario(rr) for rr in respuestas_modelos]
            comentario = self._mapear_comentario(r, respuestas)
            resultado.append(comentario)
        return resultado

    def eliminar_comentario(self, comentario_id: str, usuario_id: str) -> bool:
        try:
            c = ComentarioModel.objects.get(id=comentario_id, usuario_id=usuario_id)
            c.delete()
            return True
        except ComentarioModel.DoesNotExist:
            return False

    def _mapear_comentario(self, modelo: ComentarioModel, respuestas=None) -> Comentario:
        total_likes = LikeComentarioModel.objects.filter(comentario_id=modelo.id).count()
        return Comentario(
            id=modelo.id,
            publicacion_id=modelo.publicacion_id,
            usuario_id=modelo.usuario_id,
            texto=modelo.texto,
            autor_nombre=modelo.autor_nombre,
            padre_id=modelo.padre_id,
            fecha_creacion=modelo.fecha_creacion,
            respuestas=respuestas or [],
            total_likes=total_likes,
        )

    # --- LIKES DE COMENTARIOS ---
    def dar_like_comentario(self, comentario_id: str, usuario_id: str) -> dict:
        like, creado = LikeComentarioModel.objects.get_or_create(
            comentario_id=comentario_id,
            usuario_id=usuario_id,
            defaults={'id': str(uuid.uuid4())}
        )
        if not creado:
            like.delete()
        total = LikeComentarioModel.objects.filter(comentario_id=comentario_id).count()
        return {'usuario_dio_like': creado, 'total_likes': total}

    def contar_likes_comentario(self, comentario_id: str) -> int:
        return LikeComentarioModel.objects.filter(comentario_id=comentario_id).count()

    def usuario_dio_like_comentario(self, comentario_id: str, usuario_id: str) -> bool:
        return LikeComentarioModel.objects.filter(comentario_id=comentario_id, usuario_id=usuario_id).exists()

