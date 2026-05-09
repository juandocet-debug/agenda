from dataclasses import dataclass
from typing import Optional
import uuid
from .ValueObjects import Precio, DuracionMinutos

@dataclass
class Servicio:
    id: str
    empresa_id: str
    nombre: str
    descripcion: Optional[str]
    precio: Precio
    duracion: DuracionMinutos
    activo: bool
    
    @classmethod
    def crear(
        cls, 
        empresa_id: str, 
        nombre: str, 
        precio: Precio, 
        duracion: DuracionMinutos, 
        descripcion: Optional[str] = None
    ) -> 'Servicio':
        return cls(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            nombre=nombre,
            descripcion=descripcion,
            precio=precio,
            duracion=duracion,
            activo=True
        )

    def desactivar(self):
        """Desactiva el servicio para que ya no pueda ser agendado"""
        self.activo = False

    def activar(self):
        self.activo = True
