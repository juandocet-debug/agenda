import re
from dataclasses import dataclass

@dataclass(frozen=True)
class ColorHex:
    value: str
    
    def __post_init__(self):
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', self.value):
            raise ValueError(f"Color inválido: {self.value}. Debe ser un código hexadecimal (ej: #FF0000).")
