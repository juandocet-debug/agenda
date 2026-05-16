from decimal import Decimal
from typing import Optional
from modulos.Servicios.dominio.ValueObjects import Precio, DuracionMinutos
from modulos.Servicios.dominio.Entidades import Servicio
from modulos.Servicios.dominio.ServicioRepositoryPort import ServicioRepositoryPort

class ActualizarServicio:
    def __init__(self, servicio_repository: ServicioRepositoryPort):
        self.servicio_repository = servicio_repository

    def run(
        self, 
        servicio_id: str, 
        empresa_id: str,
        nombre: str, 
        precio_valor: float, 
        tipo_servicio: str = 'CITA',
        duracion_minutos: Optional[int] = None, 
        descripcion: Optional[str] = None,
        imagen_url: Optional[str] = None,
        activo: bool = True,
        permite_sesion: bool = True,
        precio_30_dias: Optional[float] = None,
        precio_90_dias: Optional[float] = None,
        precio_120_dias: Optional[float] = None
    ) -> Servicio:
        
        servicio = self.servicio_repository.obtener_por_id(servicio_id)
        if not servicio or servicio.empresa_id != empresa_id:
            raise Exception("Servicio no encontrado o no pertenece a esta empresa.")
        
        precio = Precio(valor=Decimal(str(precio_valor)))
        duracion = DuracionMinutos(valor=duracion_minutos) if duracion_minutos else None
        
        servicio.nombre = nombre
        servicio.precio = precio
        servicio.tipo_servicio = tipo_servicio
        servicio.duracion = duracion
        servicio.descripcion = descripcion
        servicio.permite_sesion = permite_sesion
        servicio.precio_30_dias = Decimal(str(precio_30_dias)) if precio_30_dias is not None else None
        servicio.precio_90_dias = Decimal(str(precio_90_dias)) if precio_90_dias is not None else None
        servicio.precio_120_dias = Decimal(str(precio_120_dias)) if precio_120_dias is not None else None
        if imagen_url is not None:
            servicio.imagen_url = imagen_url
            
        if activo:
            servicio.activar()
        else:
            servicio.desactivar()
        
        self.servicio_repository.guardar(servicio)
        
        return servicio
