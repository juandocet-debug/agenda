"""
Dominio — Entidad Sede.
Una Sede (sucursal) pertenece a una Empresa y tiene nombre, dirección y estado activo.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Sede:
    id: str
    empresa_id: str
    nombre: str
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    telefono: Optional[str] = None
    activa: bool = True
