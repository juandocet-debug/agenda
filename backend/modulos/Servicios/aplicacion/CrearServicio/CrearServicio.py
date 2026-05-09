from decimal import Decimal
from typing import Optional
from modulos.Servicios.dominio.ValueObjects import Precio, DuracionMinutos
from modulos.Servicios.dominio.Entidades import Servicio
from modulos.Servicios.dominio.ServicioRepositoryPort import ServicioRepositoryPort

class CrearServicio:
    def __init__(self, servicio_repository: ServicioRepositoryPort):
        self.servicio_repository = servicio_repository

    def run(
        self, 
        empresa_id: str, 
        nombre: str, 
        precio_valor: float, 
        duracion_minutos: int, 
        descripcion: Optional[str] = None
    ) -> Servicio:
        
        # 1. Crear Value Objects (Validarán que precio no sea negativo y duración sea > 0)
        precio = Precio(valor=Decimal(str(precio_valor)))
        duracion = DuracionMinutos(valor=duracion_minutos)
        
        # 2. Crear Entidad
        nuevo_servicio = Servicio.crear(
            empresa_id=empresa_id,
            nombre=nombre,
            precio=precio,
            duracion=duracion,
            descripcion=descripcion
        )
        
        # 3. Guardar en el repositorio
        self.servicio_repository.guardar(nuevo_servicio)
        
        return nuevo_servicio
