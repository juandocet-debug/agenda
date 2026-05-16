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
        tipo_servicio: str = 'CITA',
        duracion_minutos: Optional[int] = None, 
        descripcion: Optional[str] = None,
        imagen_url: Optional[str] = None,
        permite_sesion: bool = True,
        precio_30_dias: Optional[float] = None,
        precio_90_dias: Optional[float] = None,
        precio_120_dias: Optional[float] = None
    ) -> Servicio:
        
        precio = Precio(valor=Decimal(str(precio_valor)))
        duracion = DuracionMinutos(valor=duracion_minutos) if duracion_minutos else None
        
        p30 = Decimal(str(precio_30_dias)) if precio_30_dias is not None else None
        p90 = Decimal(str(precio_90_dias)) if precio_90_dias is not None else None
        p120 = Decimal(str(precio_120_dias)) if precio_120_dias is not None else None
        
        nuevo_servicio = Servicio.crear(
            empresa_id=empresa_id,
            nombre=nombre,
            precio=precio,
            tipo_servicio=tipo_servicio,
            duracion=duracion,
            descripcion=descripcion,
            imagen_url=imagen_url,
            permite_sesion=permite_sesion,
            precio_30_dias=p30,
            precio_90_dias=p90,
            precio_120_dias=p120
        )
        
        self.servicio_repository.guardar(nuevo_servicio)
        
        return nuevo_servicio

