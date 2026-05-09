from abc import ABC, abstractmethod
from typing import Dict, Any

class ReportesQueryPort(ABC):
    @abstractmethod
    def obtener_resumen_financiero(self, empresa_id: str) -> Dict[str, Any]:
        """Debe retornar un diccionario con totales: ventas, cobrado, pendiente."""
        pass
