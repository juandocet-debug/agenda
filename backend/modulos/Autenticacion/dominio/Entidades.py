from dataclasses import dataclass
from .ValueObjects import PasswordHash

@dataclass
class Credencial:
    usuario_id: str
    username: str
    email: str
    password_hash: PasswordHash
    activo: bool
    rol: str = 'empresa'
