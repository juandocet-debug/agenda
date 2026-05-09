from abc import ABC, abstractmethod
from typing import Optional
from .Entidades import RegistroPago

class PagoRepositoryPort(ABC):
    @abstractmethod
    def guardar(self, pago: RegistroPago) -> None:
        pass

    @abstractmethod
    def obtener_por_cita(self, cita_id: str) -> Optional[RegistroPago]:
        pass
