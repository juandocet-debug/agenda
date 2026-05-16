"""
DjangoSedeRepository — Implementación del port usando Django ORM.
Adaptador de infraestructura que traduce entre la entidad de dominio y el modelo Django.
"""
from typing import List, Optional
from ..dominio.Entidades import Sede
from ..dominio.SedeRepositoryPort import SedeRepositoryPort
from .models import SedeModel


def _to_domain(m: SedeModel) -> Sede:
    return Sede(
        id=m.id,
        empresa_id=m.empresa_id,
        nombre=m.nombre,
        direccion=m.direccion,
        ciudad=m.ciudad,
        telefono=m.telefono,
        activa=m.activa,
    )


class DjangoSedeRepository(SedeRepositoryPort):

    def crear(self, sede: Sede) -> Sede:
        m = SedeModel.objects.create(
            id=sede.id,
            empresa_id=sede.empresa_id,
            nombre=sede.nombre,
            direccion=sede.direccion,
            ciudad=sede.ciudad,
            telefono=sede.telefono,
            activa=sede.activa,
        )
        return _to_domain(m)

    def listar_por_empresa(self, empresa_id: str) -> List[Sede]:
        return [_to_domain(m) for m in SedeModel.objects.filter(empresa_id=empresa_id)]

    def listar_activas_por_empresa(self, empresa_id: str) -> List[Sede]:
        return [_to_domain(m) for m in SedeModel.objects.filter(empresa_id=empresa_id, activa=True)]

    def obtener_por_id(self, sede_id: str) -> Optional[Sede]:
        try:
            return _to_domain(SedeModel.objects.get(id=sede_id))
        except SedeModel.DoesNotExist:
            return None

    def actualizar(self, sede: Sede) -> Sede:
        SedeModel.objects.filter(id=sede.id).update(
            nombre=sede.nombre,
            direccion=sede.direccion,
            ciudad=sede.ciudad,
            telefono=sede.telefono,
            activa=sede.activa,
        )
        return self.obtener_por_id(sede.id)

    def desactivar(self, sede_id: str, empresa_id: str) -> bool:
        updated = SedeModel.objects.filter(id=sede_id, empresa_id=empresa_id).update(activa=False)
        return updated > 0
