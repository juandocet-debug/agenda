"""
RestablecerPassword.py — Caso de uso: el usuario establece su nueva contraseña.

Flujo:
  1. Buscar el token en el repositorio.
  2. Validar que el token existe, no ha sido usado y no ha expirado.
  3. Validar la nueva contraseña (longitud mínima).
  4. Obtener la credencial asociada al email del token.
  5. Hashear la nueva contraseña y guardar.
  6. Marcar el token como usado (single-use guarantee).
  7. Retornar el rol del usuario para que el frontend redirija correctamente.
"""
from datetime import datetime, timezone

from modulos.Autenticacion.dominio.AutenticacionRepositoryPort import AutenticacionRepositoryPort
from modulos.Autenticacion.dominio.PasswordResetRepositoryPort import PasswordResetRepositoryPort
from modulos.Autenticacion.dominio.PasswordHasherPort import PasswordHasherPort
from modulos.Autenticacion.dominio.ValueObjects import PasswordHash


_MIN_PASSWORD_LEN = 6


class RestablecerPassword:
    def __init__(
        self,
        auth_repo: AutenticacionRepositoryPort,
        reset_repo: PasswordResetRepositoryPort,
        hasher: PasswordHasherPort,
    ):
        self.auth_repo = auth_repo
        self.reset_repo = reset_repo
        self.hasher = hasher

    def run(self, token_str: str, nueva_password: str) -> str:
        """
        Restablece la contraseña y devuelve el rol del usuario.
        Lanza ValueError con mensaje descriptivo si algo falla.
        """
        # 1. Validar longitud mínima antes de tocar la BD
        if len(nueva_password) < _MIN_PASSWORD_LEN:
            raise ValueError(f"La contraseña debe tener al menos {_MIN_PASSWORD_LEN} caracteres.")

        # 2. Buscar el token
        reset_token = self.reset_repo.obtener_token(token_str)
        if not reset_token:
            raise ValueError("El link de recuperación no es válido. Solicita uno nuevo.")

        # 3. Verificar que no esté ya usado
        if reset_token.usado:
            raise ValueError("Este link ya fue utilizado. Solicita un nuevo link de recuperación.")

        # 4. Verificar que no haya expirado
        ahora = datetime.now(timezone.utc)
        expira = reset_token.expira_en
        # Normalizar timezone si viene sin tzinfo desde la BD
        if expira.tzinfo is None:
            from datetime import timezone as tz
            expira = expira.replace(tzinfo=tz.utc)
        if ahora > expira:
            raise ValueError("El link de recuperación ha expirado. Solicita uno nuevo.")

        # 5. Obtener la credencial del usuario asociado al token
        credencial = self.auth_repo.obtener_por_email(reset_token.email)
        if not credencial or not credencial.activo:
            raise ValueError("No se encontró una cuenta activa asociada a este link.")

        # 6. Hashear y guardar la nueva contraseña
        nuevo_hash = self.hasher.hash(nueva_password)
        credencial.password_hash = PasswordHash(value=nuevo_hash)
        self.auth_repo.guardar_credencial(credencial)

        # 7. Invalidar el token (single-use)
        self.reset_repo.marcar_como_usado(token_str)

        return credencial.rol
