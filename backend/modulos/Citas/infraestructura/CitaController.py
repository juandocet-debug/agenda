import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import datetime

logger = logging.getLogger(__name__)

from .DjangoCitaRepository import DjangoCitaRepository
from modulos.Citas.aplicacion.AgendarCita.AgendarCita import AgendarCita

from modulos.Notificaciones.infraestructura.DjangoEmailAdapter import DjangoEmailAdapter
from modulos.Pagos.infraestructura.DjangoPagoRepository import DjangoPagoRepository
from modulos.Pagos.aplicacion.InicializarPago.InicializarPago import InicializarPago
from modulos.Servicios.infraestructura.DjangoServicioRepository import DjangoServicioRepository

class AgendarCitaController(APIView):
    def post(self, request):
        data = request.data
        try:
            empresa_id = data.get('empresa_id')
            cliente_id = data.get('cliente_id')
            asesor_id = data.get('asesor_id')
            servicio_id = data.get('servicio_id')
            fecha_str = data.get('fecha')
            hora_inicio_str = data.get('hora_inicio')
            hora_fin_str = data.get('hora_fin')
            notas = data.get('notas')
            
            if not all([empresa_id, cliente_id, asesor_id, servicio_id, fecha_str, hora_inicio_str, hora_fin_str]):
                return Response({'ok': False, 'error': 'Faltan datos requeridos'}, status=400)
                
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            hora_inicio = datetime.strptime(hora_inicio_str, "%H:%M").time()
            hora_fin = datetime.strptime(hora_fin_str, "%H:%M").time()

            # Dependencias
            repo_cita = DjangoCitaRepository()
            email_adapter = DjangoEmailAdapter()
            
            # Agendar Cita
            caso_uso_cita = AgendarCita(
                cita_repository=repo_cita, 
                notificacion_port=email_adapter
            )
            
            cita = caso_uso_cita.run(
                empresa_id=empresa_id,
                cliente_id=cliente_id,
                asesor_id=asesor_id,
                servicio_id=servicio_id,
                fecha=fecha,
                hora_inicio=hora_inicio,
                hora_fin=hora_fin,
                notas=notas
            )
            
            # Inicializar Pago (Buscar precio del servicio primero)
            repo_servicio = DjangoServicioRepository()
            servicio = repo_servicio.obtener_por_id(servicio_id)
            if servicio:
                repo_pago = DjangoPagoRepository()
                caso_uso_pago = InicializarPago(pago_repository=repo_pago)
                caso_uso_pago.run(
                    empresa_id=empresa_id,
                    cita_id=cita.id.value,
                    total_a_pagar=float(servicio.precio.valor)
                )

            return Response({
                'ok': True, 
                'datos': {
                    'cita_id': cita.id.value,
                    'estado': cita.estado.value
                }
            }, status=201)
            
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.exception("[AgendarCitaController] Error interno")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)
