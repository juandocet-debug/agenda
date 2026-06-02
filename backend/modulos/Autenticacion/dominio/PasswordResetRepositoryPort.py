"""
PasswordResetRepositoryPort.py — Puerto del dominio para la recuperación de contraseñas.
Define el contrato que debe cumplir cualquier implementación de infraestructura.
"""
from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class PasswordResetToken:
    """Entidad de dominio: token de un solo uso para restablecer contraseña."""
    token: str
    email: str
    creado_en: datetime
    expira_en: datetime
    usado: bool = False


class PasswordResetRepositoryPort(ABC):

    @abstractmethod
    def guardar_token(self, reset_token: PasswordResetToken) -> None:
        """Persiste un nuevo token de recuperación."""
        pass

    @abstractmethod
    def obtener_token(self, token: str) -> Optional[PasswordResetToken]:
        """Recupera el token si existe. Devuelve None si no existe."""
        pass

    @abstractmethod
    def marcar_como_usado(self, token: str) -> None:
        """Invalida el token para que no pueda reutilizarse."""
        pass

    @abstractmethod
    def eliminar_tokens_vencidos(self) -> None:
        """Limpieza periódica de tokens expirados (buenas prácticas)."""
        pass
