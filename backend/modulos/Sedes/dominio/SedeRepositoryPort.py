"""
Port — Interfaz abstracta del repositorio de Sedes.
Define el contrato que cualquier implementación debe cumplir (hexagonal).
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from .Entidades import Sede


class SedeRepositoryPort(ABC):

    @abstractmethod
    def crear(self, sede: Sede) -> Sede: ...

    @abstractmethod
    def listar_por_empresa(self, empresa_id: str) -> List[Sede]: ...

    @abstractmethod
    def listar_activas_por_empresa(self, empresa_id: str) -> List[Sede]: ...

    @abstractmethod
    def obtener_por_id(self, sede_id: str) -> Optional[Sede]: ...

    @abstractmethod
    def actualizar(self, sede: Sede) -> Sede: ...

    @abstractmethod
    def desactivar(self, sede_id: str, empresa_id: str) -> bool: ...
