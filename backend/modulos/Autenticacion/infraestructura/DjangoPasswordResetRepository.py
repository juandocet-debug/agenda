"""
DjangoPasswordResetRepository.py — Implementación del puerto PasswordResetRepositoryPort
usando Django ORM sobre PostgreSQL (Railway / Neon).

Sigue la arquitectura hexagonal: solo conoce el modelo de infraestructura
y el contrato del dominio. Los casos de uso no conocen Django.
"""
from datetime import datetime, timezone
from typing import Optional

from modulos.Autenticacion.dominio.PasswordResetRepositoryPort import (
    PasswordResetRepositoryPort,
    PasswordResetToken,
)
from .models import PasswordResetTokenModel


class DjangoPasswordResetRepository(PasswordResetRepositoryPort):

    def guardar_token(self, reset_token: PasswordResetToken) -> None:
        PasswordResetTokenModel.objects.create(
            token=reset_token.token,
            email=reset_token.email,
            expira_en=reset_token.expira_en,
            usado=reset_token.usado,
        )

    def obtener_token(self, token: str) -> Optional[PasswordResetToken]:
        try:
            m = PasswordResetTokenModel.objects.get(token=token)
            creado_en = m.creado_en
            expira_en = m.expira_en
            # Asegurar que los datetimes tengan tzinfo (PostgreSQL los devuelve con tz)
            if creado_en.tzinfo is None:
                creado_en = creado_en.replace(tzinfo=timezone.utc)
            if expira_en.tzinfo is None:
                expira_en = expira_en.replace(tzinfo=timezone.utc)
            return PasswordResetToken(
                token=m.token,
                email=m.email,
                creado_en=creado_en,
                expira_en=expira_en,
                usado=m.usado,
            )
        except PasswordResetTokenModel.DoesNotExist:
            return None

    def marcar_como_usado(self, token: str) -> None:
        PasswordResetTokenModel.objects.filter(token=token).update(usado=True)

    def eliminar_tokens_vencidos(self) -> None:
        ahora = datetime.now(timezone.utc)
        PasswordResetTokenModel.objects.filter(expira_en__lt=ahora, usado=True).delete()
