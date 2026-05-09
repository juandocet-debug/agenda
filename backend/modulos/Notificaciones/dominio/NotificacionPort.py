from abc import ABC, abstractmethod
from .Entidades import Mensaje

class NotificacionPort(ABC):
    @abstractmethod
    def enviar(self, mensaje: Mensaje) -> bool:
        """Envía la notificación y devuelve True si fue exitoso."""
        pass
