import uuid
from typing import Optional
from modulos.Autenticacion.dominio.AutenticacionRepositoryPort import AutenticacionRepositoryPort
from modulos.Autenticacion.dominio.PasswordHasherPort import PasswordHasherPort
from modulos.Autenticacion.dominio.Entidades import Credencial
from modulos.Autenticacion.dominio.ValueObjects import PasswordHash

# Nota: Como el caso de uso es de Autenticacion, idealmente se comunica con Empresas
# a través de un puerto de Empresas o usando los modelos si permitimos acoplamiento en infraestructura.
# Por limpieza, inyectaremos un callback o repositorio para guardar la empresa,
# o podemos manejarlo a nivel de controlador. Para simplificar, usaremos un "EmpresaCreatorPort"
# pero como no lo tenemos definido, importaremos el modelo directamente por ahora (acoplamiento leve).
from modulos.Empresas.infraestructura.models import EmpresaModel

class RegistrarEmpresaUseCase:
    def __init__(self, repo_auth: AutenticacionRepositoryPort, hasher: PasswordHasherPort):
        self.repo_auth = repo_auth
        self.hasher = hasher

    def run(self, nombre_empresa: str, email: str, username: str, password_plano: str) -> str:
        # 1. Validar que no exista el email
        if self.repo_auth.obtener_por_email(email):
            raise ValueError("El email ya est registrado.")
        
        # 2. Validar que no exista el username
        if self.repo_auth.obtener_por_username(username):
            raise ValueError("El nombre de usuario ya est en uso.")

        # 3. Generar ID e instanciar encriptacin
        nuevo_id = str(uuid.uuid4())
        hashed = self.hasher.hash(password_plano)
        
        credencial = Credencial(
            usuario_id=nuevo_id,
            username=username,
            email=email,
            password_hash=PasswordHash(value=hashed),
            activo=False # Nacen Inactivas según regla de negocio (Requiere aprobación del SuperAdmin)
        )

        # 4. Guardar Credencial
        self.repo_auth.guardar_credencial(credencial)

        # 5. Crear la Empresa en la DB
        # Slug simple (reemplazar espacios por guiones)
        base_slug = nombre_empresa.lower().replace(" ", "-")
        
        # Si el slug existe, le agregamos el short id
        slug_final = base_slug
        if EmpresaModel.objects.filter(slug=base_slug).exists():
            slug_final = f"{base_slug}-{nuevo_id[:4]}"

        EmpresaModel.objects.create(
            id=nuevo_id,
            nombre=nombre_empresa,
            slug=slug_final
        )

        return nuevo_id
