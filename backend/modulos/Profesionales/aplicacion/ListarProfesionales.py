from typing import List
from ..dominio.Entidades import Profesional
from ..dominio.ProfesionalRepositoryPort import ProfesionalRepositoryPort

class ListarProfesionalesUseCase:
    def __init__(self, repositorio: ProfesionalRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, empresa_id: str) -> List[Profesional]:
        if not empresa_id:
            raise Exception("El ID de la empresa es obligatorio para listar")
        
        return self.repositorio.obtener_por_empresa(empresa_id)
