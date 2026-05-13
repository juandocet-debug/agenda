from modulos.Servicios.dominio.ServicioRepositoryPort import ServicioRepositoryPort

class EliminarServicio:
    def __init__(self, servicio_repository: ServicioRepositoryPort):
        self.servicio_repository = servicio_repository

    def run(self, servicio_id: str, empresa_id: str) -> bool:
        servicio = self.servicio_repository.obtener_por_id(servicio_id)
        if not servicio or servicio.empresa_id != empresa_id:
            raise Exception("Servicio no encontrado o no pertenece a esta empresa.")
        
        # Desactivación lógica
        servicio.desactivar()
        self.servicio_repository.guardar(servicio)
        
        return True
