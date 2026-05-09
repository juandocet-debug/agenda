from typing import Optional
from decimal import Decimal
from modulos.Pagos.dominio.PagoRepositoryPort import PagoRepositoryPort
from modulos.Pagos.dominio.Entidades import RegistroPago
from modulos.Pagos.dominio.ValueObjects import Monto, EstadoPago
from .models import PagoModel

class DjangoPagoRepository(PagoRepositoryPort):
    def guardar(self, pago: RegistroPago) -> None:
        PagoModel.objects.update_or_create(
            id=pago.id,
            defaults={
                'empresa_id': pago.empresa_id,
                'cita_id': pago.cita_id,
                'monto_total': pago.monto_total.valor,
                'monto_pagado': pago.monto_pagado.valor,
                'estado': pago.estado.value,
                'metodo_pago_ultimo': pago.metodo_pago_ultimo
            }
        )

    def obtener_por_cita(self, cita_id: str) -> Optional[RegistroPago]:
        try:
            m = PagoModel.objects.get(cita_id=cita_id)
            return RegistroPago(
                id=m.id,
                empresa_id=m.empresa_id,
                cita_id=m.cita_id,
                monto_total=Monto(valor=m.monto_total),
                monto_pagado=Monto(valor=m.monto_pagado),
                estado=EstadoPago(m.estado),
                metodo_pago_ultimo=m.metodo_pago_ultimo
            )
        except PagoModel.DoesNotExist:
            return None
