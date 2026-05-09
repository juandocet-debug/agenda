from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date
from .Entidades import Cita
from .ValueObjects import CitaId

class CitaRepositoryPort(ABC):
    @abstractmethod
    def guardar(self, cita: Cita) -> None:
        """Guarda o actualiza una cita en la persistencia."""
        pass

    @abstractmethod
    def obtener_por_id(self, cita_id: CitaId) -> Optional[Cita]:
        """Obtiene una cita por su ID."""
        pass

    @abstractmethod
    def listar_por_asesor_y_fecha(self, asesor_id: str, fecha: date) -> List[Cita]:
        """Devuelve todas las citas de un asesor en una fecha específica."""
        pass
