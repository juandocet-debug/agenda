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
    tipo_servicio: str
    duracion: Optional[DuracionMinutos]
    imagen_url: Optional[str]
    activo: bool
    
    @classmethod
    def crear(
        cls, 
        empresa_id: str, 
        nombre: str, 
        precio: Precio, 
        tipo_servicio: str = 'CITA',
        duracion: Optional[DuracionMinutos] = None, 
        descripcion: Optional[str] = None,
        imagen_url: Optional[str] = None
    ) -> 'Servicio':
        if tipo_servicio == 'CITA' and duracion is None:
            raise ValueError("Las citas requieren una duración en minutos.")
            
        return cls(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            nombre=nombre,
            descripcion=descripcion,
            precio=precio,
            tipo_servicio=tipo_servicio,
            duracion=duracion,
            imagen_url=imagen_url,
            activo=True
        )

    def desactivar(self):
        """Desactiva el servicio para que ya no pueda ser agendado"""
        self.activo = False

    def activar(self):
        self.activo = True
