from typing import Optional
from modulos.Autenticacion.dominio.AutenticacionRepositoryPort import AutenticacionRepositoryPort
from modulos.Autenticacion.dominio.Entidades import Credencial
from modulos.Autenticacion.dominio.ValueObjects import PasswordHash
from .models import CredencialModel

class DjangoAutenticacionRepository(AutenticacionRepositoryPort):
    def obtener_por_email(self, email: str) -> Optional[Credencial]:
        try:
            m = CredencialModel.objects.get(email__iexact=email)
            return Credencial(
                usuario_id=m.usuario_id,
                username=m.username,
                email=m.email,
                password_hash=PasswordHash(value=m.password_hash),
                activo=m.activo,
                rol=m.rol
            )
        except CredencialModel.DoesNotExist:
            return None

    def obtener_por_username(self, username: str) -> Optional[Credencial]:
        try:
            m = CredencialModel.objects.get(username__iexact=username)
            return Credencial(
                usuario_id=m.usuario_id,
                username=m.username,
                email=m.email,
                password_hash=PasswordHash(value=m.password_hash),
                activo=m.activo,
                rol=m.rol
            )
        except CredencialModel.DoesNotExist:
            return None

    def eliminar_por_usuario_id(self, usuario_id: str) -> bool:
        try:
            m = CredencialModel.objects.get(usuario_id=usuario_id)
            m.delete()
            return True
        except CredencialModel.DoesNotExist:
            return False

    def guardar_credencial(self, credencial: Credencial) -> None:
        CredencialModel.objects.update_or_create(
            usuario_id=credencial.usuario_id,
            defaults={
                'username': credencial.username,
                'email': credencial.email,
                'password_hash': credencial.password_hash.value,
                'activo': credencial.activo,
                'rol': credencial.rol
            }
        )
