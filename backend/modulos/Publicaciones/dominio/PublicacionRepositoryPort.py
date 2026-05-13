from abc import ABC, abstractmethod
from typing import List, Optional
from .Entidades import Publicacion, Like, Comentario

class PublicacionRepositoryPort(ABC):

    @abstractmethod
    def guardar(self, publicacion: Publicacion) -> Publicacion:
        pass

    @abstractmethod
    def obtener_por_empresa(self, empresa_id: str, usuario_id: str = None, limit: int = 10, offset: int = 0) -> List[Publicacion]:
        pass

    @abstractmethod
    def eliminar(self, id: str) -> bool:
        pass

    # --- Likes ---
    @abstractmethod
    def dar_like(self, publicacion_id: str, usuario_id: str) -> bool:
        """Agrega like. Devuelve True si se agregó, False si ya existía (toggle)."""
        pass

    @abstractmethod
    def contar_likes(self, publicacion_id: str) -> int:
        pass

    @abstractmethod
    def usuario_dio_like(self, publicacion_id: str, usuario_id: str) -> bool:
        pass

    # --- Comentarios ---
    @abstractmethod
    def agregar_comentario(self, comentario: Comentario) -> Comentario:
        pass

    @abstractmethod
    def listar_comentarios(self, publicacion_id: str) -> List[Comentario]:
        pass

    @abstractmethod
    def eliminar_comentario(self, comentario_id: str, usuario_id: str) -> bool:
        pass

    # --- Likes de Comentarios ---
    @abstractmethod
    def dar_like_comentario(self, comentario_id: str, usuario_id: str) -> dict:
        pass

    @abstractmethod
    def contar_likes_comentario(self, comentario_id: str) -> int:
        pass

    @abstractmethod
    def usuario_dio_like_comentario(self, comentario_id: str, usuario_id: str) -> bool:
        pass
