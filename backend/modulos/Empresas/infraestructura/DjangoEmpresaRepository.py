from modulos.Empresas.dominio.EmpresaRepositoryPort import EmpresaRepositoryPort
from .models import EmpresaModel

class DjangoEmpresaRepository(EmpresaRepositoryPort):
    def eliminar(self, id: str) -> bool:
        try:
            empresa = EmpresaModel.objects.get(id=id)
            empresa.delete()
            return True
        except EmpresaModel.DoesNotExist:
            return False
