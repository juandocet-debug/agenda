from typing import List, Optional
from modulos.Usuarios.dominio.UsuarioRepositoryPort import UsuarioRepositoryPort
from modulos.Usuarios.dominio.Entidades import Usuario
from modulos.Usuarios.dominio.ValueObjects import Email, RolUsuario
from .models import UsuarioModel

class DjangoUsuarioRepository(UsuarioRepositoryPort):
    def guardar(self, usuario: Usuario) -> None:
        UsuarioModel.objects.update_or_create(
            id=usuario.id,
            defaults={
                'empresa_id': usuario.empresa_id,
                'nombre': usuario.nombre,
                'email': usuario.email.value,
                'rol': usuario.rol.value,
                'telefono': usuario.telefono,
                'activo': usuario.activo
            }
        )

    def obtener_por_id(self, usuario_id: str) -> Optional[Usuario]:
        try:
            m = UsuarioModel.objects.get(id=usuario_id)
            return self._to_domain(m)
        except UsuarioModel.DoesNotExist:
            return None

    def obtener_por_email(self, email: Email) -> Optional[Usuario]:
        try:
            m = UsuarioModel.objects.get(email=email.value)
            return self._to_domain(m)
        except UsuarioModel.DoesNotExist:
            return None

    def listar_por_empresa(self, empresa_id: str) -> List[Usuario]:
        qs = UsuarioModel.objects.filter(empresa_id=empresa_id)
        return [self._to_domain(m) for m in qs]

    def _to_domain(self, m: UsuarioModel) -> Usuario:
        return Usuario(
            id=m.id,
            empresa_id=m.empresa_id,
            nombre=m.nombre,
            email=Email(value=m.email),
            rol=RolUsuario(m.rol),
            telefono=m.telefono,
            activo=m.activo
        )
