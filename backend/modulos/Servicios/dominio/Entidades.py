from dataclasses import dataclass
from typing import Optional
import uuid
from decimal import Decimal
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
    permite_sesion: bool = True
    precio_30_dias: Optional[Decimal] = None
    precio_90_dias: Optional[Decimal] = None
    precio_120_dias: Optional[Decimal] = None
    
    @classmethod
    def crear(
        cls, 
        empresa_id: str, 
        nombre: str, 
        precio: Precio, 
        tipo_servicio: str = 'CITA',
        duracion: Optional[DuracionMinutos] = None, 
        descripcion: Optional[str] = None,
        imagen_url: Optional[str] = None,
        permite_sesion: bool = True,
        precio_30_dias: Optional[Decimal] = None,
        precio_90_dias: Optional[Decimal] = None,
        precio_120_dias: Optional[Decimal] = None
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
            activo=True,
            permite_sesion=permite_sesion,
            precio_30_dias=precio_30_dias,
            precio_90_dias=precio_90_dias,
            precio_120_dias=precio_120_dias
        )

    def desactivar(self):
        """Desactiva el servicio para que ya no pueda ser agendado"""
        self.activo = False

    def activar(self):
        self.activo = True
