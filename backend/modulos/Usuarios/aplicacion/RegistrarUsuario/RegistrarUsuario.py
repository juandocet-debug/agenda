from typing import Optional
from modulos.Usuarios.dominio.ValueObjects import Email, RolUsuario
from modulos.Usuarios.dominio.Entidades import Usuario
from modulos.Usuarios.dominio.UsuarioRepositoryPort import UsuarioRepositoryPort

class RegistrarUsuario:
    def __init__(self, usuario_repository: UsuarioRepositoryPort):
        self.usuario_repository = usuario_repository

    def run(
        self, 
        empresa_id: str, 
        nombre: str, 
        email_str: str, 
        rol_str: str, 
        telefono: Optional[str] = None
    ) -> Usuario:
        
        # 1. Crear y validar Value Objects
        email = Email(value=email_str)
        try:
            rol = RolUsuario(rol_str)
        except ValueError:
            raise ValueError(f"Rol inválido. Roles permitidos: {[r.value for r in RolUsuario]}")
            
        # 2. Validar regla de negocio (No duplicar correos globales o por empresa, según la necesidad. 
        # En SaaS usualmente un email pertenece a un rol o puede estar en varias empresas, 
        # pero por ahora no permitiremos el mismo correo en toda la plataforma como usuario base).
        usuario_existente = self.usuario_repository.obtener_por_email(email)
        if usuario_existente:
            raise ValueError(f"El correo {email_str} ya está registrado.")
        
        # 3. Crear Entidad
        nuevo_usuario = Usuario.registrar(
            empresa_id=empresa_id,
            nombre=nombre,
            email=email,
            rol=rol,
            telefono=telefono
        )
        
        # 4. Guardar
        self.usuario_repository.guardar(nuevo_usuario)
        
        return nuevo_usuario
