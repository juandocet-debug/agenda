from dataclasses import dataclass
import re
from enum import Enum

class RolUsuario(Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    ASESOR = "ASESOR"
    CLIENTE = "CLIENTE"

@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        regex = r'^\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
        if not re.match(regex, self.value):
            raise ValueError(f"El correo {self.value} no es válido.")
