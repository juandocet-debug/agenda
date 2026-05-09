from abc import ABC, abstractmethod
from typing import List, Optional
from .Entidades import Profesional

class ProfesionalRepositoryPort(ABC):
    @abstractmethod
    def guardar(self, profesional: Profesional) -> Profesional:
        pass

    @abstractmethod
    def obtener_por_id(self, id: str) -> Optional[Profesional]:
        pass

    @abstractmethod
    def obtener_por_empresa(self, empresa_id: str) -> List[Profesional]:
        pass

    @abstractmethod
    def eliminar(self, id: str) -> bool:
        pass
