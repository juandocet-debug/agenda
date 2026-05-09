from decimal import Decimal
from modulos.Pagos.dominio.PagoRepositoryPort import PagoRepositoryPort
from modulos.Pagos.dominio.Entidades import RegistroPago

class RegistrarAbono:
    def __init__(self, pago_repository: PagoRepositoryPort):
        self.pago_repository = pago_repository

    def run(self, cita_id: str, cantidad_abono: float, metodo_pago: str) -> RegistroPago:
        """Registra un abono (pago parcial o total) a una cita."""
        
        pago = self.pago_repository.obtener_por_cita(cita_id)
        if not pago:
            raise ValueError(f"No se encontró un registro de pago para la cita {cita_id}")
            
        if cantidad_abono <= 0:
            raise ValueError("El abono debe ser mayor a 0.")
            
        pago.abonar(cantidad=Decimal(str(cantidad_abono)), metodo_pago=metodo_pago)
        
        self.pago_repository.guardar(pago)
        return pago
