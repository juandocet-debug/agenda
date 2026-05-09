from typing import List, Optional
from datetime import date

from modulos.Citas.dominio.CitaRepositoryPort import CitaRepositoryPort
from modulos.Citas.dominio.Entidades import Cita
from modulos.Citas.dominio.ValueObjects import CitaId, EstadoCita, Horario
from .models import CitaModel

class DjangoCitaRepository(CitaRepositoryPort):
    """
    ADAPTADOR: Implementa el puerto del repositorio usando el ORM de Django.
    Se encarga de traducir entre el Mundo Django y el Mundo de Dominio puro.
    """
    
    def guardar(self, cita: Cita) -> None:
        CitaModel.objects.update_or_create(
            id=cita.id.value,
            defaults={
                'empresa_id': cita.empresa_id,
                'cliente_id': cita.cliente_id,
                'asesor_id': cita.asesor_id,
                'servicio_id': cita.servicio_id,
                'fecha': cita.horario.fecha,
                'hora_inicio': cita.horario.hora_inicio,
                'hora_fin': cita.horario.hora_fin,
                'estado': cita.estado.value,
                'notas': cita.notas
            }
        )

    def obtener_por_id(self, cita_id: CitaId) -> Optional[Cita]:
        try:
            model = CitaModel.objects.get(id=cita_id.value)
            return self._to_domain(model)
        except CitaModel.DoesNotExist:
            return None

    def listar_por_asesor_y_fecha(self, asesor_id: str, fecha: date) -> List[Cita]:
        modelos = CitaModel.objects.filter(asesor_id=asesor_id, fecha=fecha)
        return [self._to_domain(m) for m in modelos]

    def _to_domain(self, model: CitaModel) -> Cita:
        """Helper para convertir de Modelo de base de datos a Entidad de Dominio"""
        return Cita(
            id=CitaId(value=model.id),
            empresa_id=model.empresa_id,
            cliente_id=model.cliente_id,
            asesor_id=model.asesor_id,
            servicio_id=model.servicio_id,
            horario=Horario(fecha=model.fecha, hora_inicio=model.hora_inicio, hora_fin=model.hora_fin),
            estado=EstadoCita(model.estado),
            notas=model.notas
        )
