from decimal import Decimal
from modulos.Pagos.dominio.PagoRepositoryPort import PagoRepositoryPort
from modulos.Pagos.dominio.Entidades import RegistroPago

class InicializarPago:
    def __init__(self, pago_repository: PagoRepositoryPort):
        self.pago_repository = pago_repository

    def run(self, empresa_id: str, cita_id: str, total_a_pagar: float) -> RegistroPago:
        """Crea el registro de pago en estado PENDIENTE cuando se agenda una cita nueva."""
        
        # Validar que no exista un pago previo para esta cita
        pago_existente = self.pago_repository.obtener_por_cita(cita_id)
        if pago_existente:
            raise ValueError(f"Ya existe un registro de pago para la cita {cita_id}")
            
        nuevo_pago = RegistroPago.inicializar(
            empresa_id=empresa_id,
            cita_id=cita_id,
            total_a_pagar=Decimal(str(total_a_pagar))
        )
        
        self.pago_repository.guardar(nuevo_pago)
        return nuevo_pago
