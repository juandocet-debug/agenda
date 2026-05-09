from dataclasses import dataclass
from decimal import Decimal
from enum import Enum

class EstadoPago(Enum):
    PENDIENTE = "PENDIENTE"
    PARCIAL = "PARCIAL"
    COMPLETADO = "COMPLETADO"

@dataclass(frozen=True)
class Monto:
    valor: Decimal
    
    def __post_init__(self):
        if self.valor < 0:
            raise ValueError("El monto no puede ser negativo.")
