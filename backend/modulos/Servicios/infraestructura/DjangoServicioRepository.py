from typing import List, Optional
from decimal import Decimal
from modulos.Servicios.dominio.ServicioRepositoryPort import ServicioRepositoryPort
from modulos.Servicios.dominio.Entidades import Servicio
from modulos.Servicios.dominio.ValueObjects import Precio, DuracionMinutos
from .models import ServicioModel

class DjangoServicioRepository(ServicioRepositoryPort):
    def guardar(self, servicio: Servicio) -> None:
        ServicioModel.objects.update_or_create(
            id=servicio.id,
            defaults={
                'empresa_id': servicio.empresa_id,
                'nombre': servicio.nombre,
                'descripcion': servicio.descripcion,
                'tipo_servicio': servicio.tipo_servicio,
                'precio_valor': servicio.precio.valor,
                'duracion_minutos': servicio.duracion.valor if servicio.duracion else None,
                'imagen_url': servicio.imagen_url,
                'activo': servicio.activo,
                'permite_sesion': getattr(servicio, 'permite_sesion', True),
                'precio_30_dias': getattr(servicio, 'precio_30_dias', None),
                'precio_90_dias': getattr(servicio, 'precio_90_dias', None),
                'precio_120_dias': getattr(servicio, 'precio_120_dias', None),
            }
        )

    def obtener_por_id(self, servicio_id: str) -> Optional[Servicio]:
        try:
            model = ServicioModel.objects.get(id=servicio_id)
            return self._to_domain(model)
        except ServicioModel.DoesNotExist:
            return None

    def listar_por_empresa(self, empresa_id: str, solo_activos: bool = True) -> List[Servicio]:
        qs = ServicioModel.objects.filter(empresa_id=empresa_id)
        if solo_activos:
            qs = qs.filter(activo=True)
        return [self._to_domain(m) for m in qs]

    def _to_domain(self, model: ServicioModel) -> Servicio:
        return Servicio(
            id=model.id,
            empresa_id=model.empresa_id,
            nombre=model.nombre,
            descripcion=model.descripcion,
            precio=Precio(valor=model.precio_valor),
            tipo_servicio=model.tipo_servicio,
            duracion=DuracionMinutos(valor=model.duracion_minutos) if model.duracion_minutos else None,
            imagen_url=model.imagen_url,
            activo=model.activo,
            permite_sesion=getattr(model, 'permite_sesion', True),
            precio_30_dias=model.precio_30_dias,
            precio_90_dias=model.precio_90_dias,
            precio_120_dias=model.precio_120_dias,
        )
