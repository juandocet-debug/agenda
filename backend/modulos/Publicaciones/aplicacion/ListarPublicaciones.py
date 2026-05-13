from typing import List
from ..dominio.PublicacionRepositoryPort import PublicacionRepositoryPort
from ..dominio.Entidades import Publicacion

class ListarPublicacionesUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, empresa_id: str, usuario_id: str = None, limit: int = 10, offset: int = 0) -> List[Publicacion]:
        return self.repositorio.obtener_por_empresa(empresa_id, usuario_id, limit, offset)
