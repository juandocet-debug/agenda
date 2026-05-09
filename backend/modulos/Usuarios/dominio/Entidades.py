from dataclasses import dataclass
import uuid
from typing import Optional
from .ValueObjects import Email, RolUsuario

@dataclass
class Usuario:
    id: str
    empresa_id: str
    nombre: str
    email: Email
    rol: RolUsuario
    telefono: Optional[str]
    activo: bool
    
    @classmethod
    def registrar(
        cls, 
        empresa_id: str, 
        nombre: str, 
        email: Email, 
        rol: RolUsuario, 
        telefono: Optional[str] = None
    ) -> 'Usuario':
        return cls(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            nombre=nombre,
            email=email,
            rol=rol,
            telefono=telefono,
            activo=True
        )

    def desactivar(self):
        self.activo = False
        
    def activar(self):
        self.activo = True
