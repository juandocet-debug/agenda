from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import uuid
from .ValueObjects import ColorHex

@dataclass
class Empresa:
    id: str
    nombre: str
    slug: str
    logo_url: Optional[str]
    color_primario: ColorHex
    color_secundario: ColorHex
    
    @classmethod
    def registrar(cls, nombre: str, slug: str) -> 'Empresa':
        """Crea una nueva empresa con colores por defecto (Blanco y Negro)"""
        return cls(
            id=str(uuid.uuid4()),
            nombre=nombre,
            slug=slug,
            logo_url=None,
            color_primario=ColorHex("#000000"),
            color_secundario=ColorHex("#FFFFFF")
        )
        
    def configurar_marca(self, logo_url: str, color_primario: str, color_secundario: str):
        """Permite personalizar la apariencia (Marca Blanca) de la plataforma para esta empresa"""
        self.logo_url = logo_url
        self.color_primario = ColorHex(color_primario)
        self.color_secundario = ColorHex(color_secundario)

@dataclass
class Noticia:
    id: str
    empresa_id: str
    titulo: str
    contenido: str
    fecha_publicacion: datetime
    
    @classmethod
    def redactar(cls, empresa_id: str, titulo: str, contenido: str) -> 'Noticia':
        """Crea una noticia pública para que la empresa anuncie novedades"""
        return cls(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            titulo=titulo,
            contenido=contenido,
            fecha_publicacion=datetime.now()
        )
