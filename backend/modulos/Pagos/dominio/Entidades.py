from dataclasses import dataclass
import uuid
from decimal import Decimal
from typing import Optional
from .ValueObjects import Monto, EstadoPago

@dataclass
class RegistroPago:
    id: str
    empresa_id: str
    cita_id: str
    monto_total: Monto
    monto_pagado: Monto
    estado: EstadoPago
    metodo_pago_ultimo: Optional[str]
    
    @classmethod
    def inicializar(cls, empresa_id: str, cita_id: str, total_a_pagar: Decimal) -> 'RegistroPago':
        """Se llama al agendar la cita para abrir la cuenta en 0."""
        return cls(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            cita_id=cita_id,
            monto_total=Monto(valor=total_a_pagar),
            monto_pagado=Monto(valor=Decimal('0.00')),
            estado=EstadoPago.PENDIENTE,
            metodo_pago_ultimo=None
        )

    def abonar(self, cantidad: Decimal, metodo_pago: str):
        """Registra un pago parcial o total."""
        nuevo_pagado = self.monto_pagado.valor + cantidad
        
        if nuevo_pagado > self.monto_total.valor:
            raise ValueError(f"El abono excede el saldo. Restante: {self.monto_total.valor - self.monto_pagado.valor}")
            
        self.monto_pagado = Monto(valor=nuevo_pagado)
        self.metodo_pago_ultimo = metodo_pago
        
        if self.monto_pagado.valor == self.monto_total.valor:
            self.estado = EstadoPago.COMPLETADO
        elif self.monto_pagado.valor > 0:
            self.estado = EstadoPago.PARCIAL
            
    def saldo_pendiente(self) -> Decimal:
        return self.monto_total.valor - self.monto_pagado.valor
