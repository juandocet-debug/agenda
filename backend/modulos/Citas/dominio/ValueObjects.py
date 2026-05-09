from enum import Enum
from dataclasses import dataclass
from datetime import datetime, date, time
import uuid

class EstadoCita(Enum):
    PENDIENTE = "PENDIENTE"
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"
    COMPLETADA = "COMPLETADA"

@dataclass(frozen=True)
class Horario:
    fecha: date
    hora_inicio: time
    hora_fin: time

    def __post_init__(self):
        if self.hora_inicio >= self.hora_fin:
            raise ValueError("La hora de inicio debe ser anterior a la hora de fin.")

@dataclass(frozen=True)
class CitaId:
    value: str

    @classmethod
    def generar(cls) -> 'CitaId':
        return cls(value=str(uuid.uuid4()))
