from dataclasses import dataclass

@dataclass
class Mensaje:
    destinatario: str # Email o teléfono
    asunto: str
    cuerpo: str
    tipo: str # "EMAIL" o "WHATSAPP"
