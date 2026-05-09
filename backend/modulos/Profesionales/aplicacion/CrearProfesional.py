import uuid
from ..dominio.Entidades import Profesional
from ..dominio.ProfesionalRepositoryPort import ProfesionalRepositoryPort

class CrearProfesionalUseCase:
    def __init__(self, repositorio: ProfesionalRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, empresa_id: str, datos: dict) -> Profesional:
        # Validación básica (El controlador también debería validar)
        if not empresa_id:
            raise Exception("El ID de la empresa es obligatorio")
        if not datos.get('nombre'):
            raise Exception("El nombre del profesional es obligatorio")
            
        # TODO: Validar email único a nivel empresa si es necesario
        
        nuevo_profesional = Profesional(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            nombre=datos.get('nombre'),
            especialidad=datos.get('especialidad', 'General'),
            email=datos.get('email', ''),
            telefono=datos.get('telefono', ''),
            foto_url=datos.get('foto_url', None),
            activo=True
        )

        return self.repositorio.guardar(nuevo_profesional)
