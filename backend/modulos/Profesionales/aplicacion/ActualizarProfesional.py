from ..dominio.ProfesionalRepositoryPort import ProfesionalRepositoryPort

class ActualizarProfesionalUseCase:
    def __init__(self, repositorio: ProfesionalRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, empresa_id: str, profesional_id: str, datos: dict):
        profesional = self.repositorio.obtener_por_id(profesional_id)
        if not profesional:
            raise ValueError("Profesional no encontrado.")
            
        if profesional.empresa_id != empresa_id:
            raise ValueError("No tienes permisos para editar este profesional.")
            
        if 'nombre' in datos:
            profesional.nombre = datos['nombre']
        if 'especialidad' in datos:
            profesional.especialidad = datos['especialidad']
        if 'email' in datos:
            profesional.email = datos['email']
        if 'telefono' in datos:
            profesional.telefono = datos['telefono']
        if 'foto_url' in datos:
            profesional.foto_url = datos['foto_url']
        if 'activo' in datos:
            profesional.activo = datos['activo']
            
        return self.repositorio.guardar(profesional)
