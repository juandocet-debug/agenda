class Profesional:
    def __init__(self, id: str, empresa_id: str, nombre: str, especialidad: str, email: str, telefono: str, foto_url: str = None, activo: bool = True):
        self.id = id
        self.empresa_id = empresa_id
        self.nombre = nombre
        self.especialidad = especialidad
        self.email = email
        self.telefono = telefono
        self.foto_url = foto_url
        self.activo = activo

    def dict(self):
        return {
            "id": self.id,
            "empresa_id": self.empresa_id,
            "nombre": self.nombre,
            "especialidad": self.especialidad,
            "email": self.email,
            "telefono": self.telefono,
            "foto_url": self.foto_url,
            "activo": self.activo
        }
