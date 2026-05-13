import uuid
from ..dominio.PublicacionRepositoryPort import PublicacionRepositoryPort

class DarLikeUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, publicacion_id: str, usuario_id: str) -> dict:
        """Toggle: si ya dio like lo quita, si no lo da. Devuelve el estado nuevo."""
        ya_dio_like = self.repositorio.usuario_dio_like(publicacion_id, usuario_id)
        self.repositorio.dar_like(publicacion_id, usuario_id)
        total = self.repositorio.contar_likes(publicacion_id)
        return {
            "usuario_dio_like": not ya_dio_like,
            "total_likes": total,
        }


class AgregarComentarioUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, publicacion_id: str, usuario_id: str, texto: str,
                 autor_nombre: str = None, padre_id: str = None):
        from ..dominio.Entidades import Comentario
        if not texto or not texto.strip():
            raise ValueError("El comentario no puede estar vacío.")
        comentario = Comentario(
            id=str(uuid.uuid4()),
            publicacion_id=publicacion_id,
            usuario_id=usuario_id,
            texto=texto.strip(),
            autor_nombre=autor_nombre,
            padre_id=padre_id,
        )
        return self.repositorio.agregar_comentario(comentario)


class ListarComentariosUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, publicacion_id: str):
        return self.repositorio.listar_comentarios(publicacion_id)


class EliminarComentarioUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, comentario_id: str, usuario_id: str) -> bool:
        return self.repositorio.eliminar_comentario(comentario_id, usuario_id)


class DarLikeComentarioUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, comentario_id: str, usuario_id: str) -> dict:
        """Toggle like en un comentario. Devuelve estado nuevo + total."""
        return self.repositorio.dar_like_comentario(comentario_id, usuario_id)
