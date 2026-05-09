from abc import ABC, abstractmethod
from typing import List, Optional
from .Entidades import Usuario
from .ValueObjects import Email

class UsuarioRepositoryPort(ABC):
    @abstractmethod
    def guardar(self, usuario: Usuario) -> None:
        pass

    @abstractmethod
    def obtener_por_id(self, usuario_id: str) -> Optional[Usuario]:
        pass

    @abstractmethod
    def obtener_por_email(self, email: Email) -> Optional[Usuario]:
        pass

    @abstractmethod
    def listar_por_empresa(self, empresa_id: str) -> List[Usuario]:
        pass
