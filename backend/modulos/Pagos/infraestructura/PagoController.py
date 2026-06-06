import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from .DjangoPagoRepository import DjangoPagoRepository
from modulos.Pagos.aplicacion.RegistrarAbono.RegistrarAbono import RegistrarAbono

logger = logging.getLogger(__name__)

class PagoController(APIView):
    def post(self, request, cita_id):
        """Registra un abono a la cita."""
        data = request.data
        cantidad_abono = data.get('cantidad')
        metodo_pago = data.get('metodo_pago', 'EFECTIVO')
        
        if cantidad_abono is None:
            return Response({'ok': False, 'error': 'La cantidad del abono es requerida'}, status=400)
            
        repo = DjangoPagoRepository()
        caso_uso = RegistrarAbono(pago_repository=repo)
        
        try:
            pago = caso_uso.run(
                cita_id=cita_id,
                cantidad_abono=float(cantidad_abono),
                metodo_pago=metodo_pago
            )
            
            return Response({
                'ok': True,
                'datos': {
                    'pago_id': pago.id,
                    'estado': pago.estado.value,
                    'saldo_pendiente': str(pago.saldo_pendiente())
                }
            }, status=200)
            
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.exception("[PagoController] Error interno")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)

    def get(self, request, cita_id):
        """Consulta el estado del pago de una cita."""
        repo = DjangoPagoRepository()
        pago = repo.obtener_por_cita(cita_id)
        
        if not pago:
            return Response({'ok': False, 'error': 'No hay registro de pago para esta cita'}, status=404)
            
        return Response({
            'ok': True,
            'datos': {
                'monto_total': str(pago.monto_total.valor),
                'monto_pagado': str(pago.monto_pagado.valor),
                'saldo_pendiente': str(pago.saldo_pendiente()),
                'estado': pago.estado.value,
                'ultimo_metodo': pago.metodo_pago_ultimo
            }
        }, status=200)
