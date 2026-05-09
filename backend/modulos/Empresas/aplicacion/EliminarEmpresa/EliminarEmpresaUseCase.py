from modulos.Empresas.dominio.EmpresaRepositoryPort import EmpresaRepositoryPort
from modulos.Autenticacion.dominio.AutenticacionRepositoryPort import AutenticacionRepositoryPort

class EliminarEmpresaUseCase:
    def __init__(self, repo_empresa: EmpresaRepositoryPort, repo_auth: AutenticacionRepositoryPort):
        self.repo_empresa = repo_empresa
        self.repo_auth = repo_auth

    def run(self, empresa_id: str) -> None:
        # 1. Eliminar Credenciales asociadas (para mantener consistencia)
        # Ignoramos si es False porque podria no tener credencial (aunque deberia)
        self.repo_auth.eliminar_por_usuario_id(empresa_id)
        
        # 2. Eliminar la Empresa
        empresa_borrada = self.repo_empresa.eliminar(empresa_id)
        
        if not empresa_borrada:
            raise ValueError("No se encontr la empresa para eliminar.")
