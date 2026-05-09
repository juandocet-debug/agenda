from abc import ABC, abstractmethod
from typing import List, Optional
from .Entidades import Servicio

class ServicioRepositoryPort(ABC):
    @abstractmethod
    def guardar(self, servicio: Servicio) -> None:
        pass

    @abstractmethod
    def obtener_por_id(self, servicio_id: str) -> Optional[Servicio]:
        pass

    @abstractmethod
    def listar_por_empresa(self, empresa_id: str, solo_activos: bool = True) -> List[Servicio]:
        """Devuelve el portafolio de servicios de una empresa específica"""
        pass
