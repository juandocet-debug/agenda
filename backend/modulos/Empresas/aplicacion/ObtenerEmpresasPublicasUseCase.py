from modulos.Empresas.dominio.EmpresaRepositoryPort import EmpresaRepositoryPort

class ObtenerEmpresasPublicasUseCase:
    def __init__(self, repositorio: EmpresaRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, request) -> dict:
        """
        Orquesta la obtención de la lista pública de empresas, delegando la paginación
        y la consulta optimizada a la capa de infraestructura.
        """
        return self.repositorio.obtener_empresas_publicas_paginadas(request)
