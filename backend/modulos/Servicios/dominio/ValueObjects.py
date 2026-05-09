from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Precio:
    valor: Decimal
    moneda: str = "COP"
    
    def __post_init__(self):
        if self.valor < 0:
            raise ValueError("El precio de un servicio no puede ser negativo.")

@dataclass(frozen=True)
class DuracionMinutos:
    valor: int
    
    def __post_init__(self):
        if self.valor <= 0:
            raise ValueError("La duración del servicio debe ser mayor a 0 minutos.")
