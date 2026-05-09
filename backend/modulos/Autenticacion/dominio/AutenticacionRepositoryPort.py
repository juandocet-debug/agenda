from abc import ABC, abstractmethod
from typing import Optional
from .Entidades import Credencial

class AutenticacionRepositoryPort(ABC):
    @abstractmethod
    def obtener_por_email(self, email: str) -> Optional[Credencial]:
        pass

    @abstractmethod
    def obtener_por_username(self, username: str) -> Optional[Credencial]:
        pass

    @abstractmethod
    def eliminar_por_usuario_id(self, usuario_id: str) -> bool:
        pass
    
    @abstractmethod
    def guardar_credencial(self, credencial: Credencial) -> None:
        pass
