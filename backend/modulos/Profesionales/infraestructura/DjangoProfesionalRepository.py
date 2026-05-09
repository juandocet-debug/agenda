from typing import List, Optional
from ..dominio.ProfesionalRepositoryPort import ProfesionalRepositoryPort
from ..dominio.Entidades import Profesional
from .models import ProfesionalModel

class DjangoProfesionalRepository(ProfesionalRepositoryPort):

    def guardar(self, profesional: Profesional) -> Profesional:
        modelo, creado = ProfesionalModel.objects.update_or_create(
            id=profesional.id,
            defaults={
                'empresa_id': profesional.empresa_id,
                'nombre': profesional.nombre,
                'especialidad': profesional.especialidad,
                'email': profesional.email,
                'telefono': profesional.telefono,
                'foto_url': profesional.foto_url,
                'activo': profesional.activo
            }
        )
        return profesional

    def obtener_por_id(self, id: str) -> Optional[Profesional]:
        try:
            modelo = ProfesionalModel.objects.get(id=id)
            return self._mapear_a_dominio(modelo)
        except ProfesionalModel.DoesNotExist:
            return None

    def obtener_por_empresa(self, empresa_id: str) -> List[Profesional]:
        modelos = ProfesionalModel.objects.filter(empresa_id=empresa_id).order_by('-fecha_creacion')
        return [self._mapear_a_dominio(m) for m in modelos]

    def eliminar(self, id: str) -> bool:
        try:
            modelo = ProfesionalModel.objects.get(id=id)
            modelo.delete()
            return True
        except ProfesionalModel.DoesNotExist:
            return False

    def _mapear_a_dominio(self, modelo: ProfesionalModel) -> Profesional:
        return Profesional(
            id=modelo.id,
            empresa_id=modelo.empresa_id,
            nombre=modelo.nombre,
            especialidad=modelo.especialidad,
            email=modelo.email,
            telefono=modelo.telefono,
            foto_url=modelo.foto_url,
            activo=modelo.activo
        )
