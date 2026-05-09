from typing import Optional
from dataclasses import dataclass
from .ValueObjects import CitaId, EstadoCita, Horario

@dataclass
class Cita:
    id: CitaId
    empresa_id: str
    cliente_id: str
    asesor_id: str
    servicio_id: str
    horario: Horario
    estado: EstadoCita
    notas: Optional[str] = None

    @classmethod
    def agendar_nueva(
        cls, 
        empresa_id: str,
        cliente_id: str, 
        asesor_id: str, 
        servicio_id: str, 
        horario: Horario,
        notas: Optional[str] = None
    ) -> 'Cita':
        return cls(
            id=CitaId.generar(),
            empresa_id=empresa_id,
            cliente_id=cliente_id,
            asesor_id=asesor_id,
            servicio_id=servicio_id,
            horario=horario,
            estado=EstadoCita.PENDIENTE,
            notas=notas
        )

    def confirmar(self):
        if self.estado == EstadoCita.CANCELADA:
            raise ValueError("No se puede confirmar una cita cancelada.")
        self.estado = EstadoCita.CONFIRMADA

    def cancelar(self):
        self.estado = EstadoCita.CANCELADA

    def completar(self):
        if self.estado != EstadoCita.CONFIRMADA:
            raise ValueError("Solo se pueden completar citas confirmadas.")
        self.estado = EstadoCita.COMPLETADA
