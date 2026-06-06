"""
ReservaController.py — Endpoints del flujo de reserva pública (hexagonal).

Endpoints:
  GET  /api/citas/horario/<empresa_id>/         → obtener horarios configurados
  POST /api/citas/horario/<empresa_id>/         → empresa configura sus horarios
  GET  /api/citas/slots/?empresa_id=&fecha=&servicio_id=
  POST /api/citas/reservar-guest/              → crea cita sin auth (guest)
  POST /api/citas/wompi/webhook/               → confirma pago (Wompi webhook)
  GET  /api/citas/empresa/<empresa_id>/        → lista citas de la empresa (auth)
"""
import uuid
import json
import hmac
import hashlib
import os
from datetime import datetime, date, timedelta, time
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from django.conf import settings


# ─── Throttles personalizados para endpoints públicos sensibles ───────────────

class ReservaGuestThrottle(AnonRateThrottle):
    """Máximo 10 reservas por minuto por IP — previene spam de reservas."""
    scope = 'reserva_guest'

class SlotsThrottle(AnonRateThrottle):
    """Máximo 60 consultas de slots por minuto por IP."""
    scope = 'slots'

class UploadImagenThrottle(UserRateThrottle):
    """Máximo 20 uploads por minuto por usuario autenticado."""
    scope = 'upload_imagen'

from .models import CitaModel, HorarioEmpresaModel
from modulos.Empresas.infraestructura.models import EmpresaModel
from modulos.Servicios.infraestructura.models import ServicioModel
from modulos.Profesionales.infraestructura.models import ProfesionalModel
from modulos.Pagos.infraestructura.models import PagoModel


# ─── helpers ────────────────────────────────────────────────────────────────

def _generar_slots(hora_inicio: time, hora_fin: time, duracion_min: int):
    """Genera lista de strings HH:MM de slots en un rango dado."""
    slots = []
    if hora_inicio >= hora_fin:
        raise ValueError("La hora de inicio es mayor o igual a la hora de fin.")
        
    actual = datetime.combine(date.today(), hora_inicio)
    fin = datetime.combine(date.today(), hora_fin)
    while actual + timedelta(minutes=duracion_min) <= fin:
        slots.append(actual.strftime('%H:%M'))
        actual += timedelta(minutes=duracion_min)
    return slots


def _slots_ocupados(empresa_id: str, profesional_id, fecha_obj: date, sede_id=None):
    """Retorna set de strings 'HH:MM' ya reservados (considera sede si se provee)."""
    q = CitaModel.objects.filter(
        empresa_id=empresa_id,
        fecha=fecha_obj,
        estado__in=['CONFIRMADA'],  # Solo citas con pago confirmado bloquean el slot
    )
    if profesional_id:
        q = q.filter(profesional_id=profesional_id)
    if sede_id:
        q = q.filter(sede_id=sede_id)
    return {c.hora_inicio.strftime('%H:%M') for c in q}


def _cupos_usados(empresa_id: str, fecha_obj: date, hora_str: str, sede_id=None) -> int:
    """Retorna cuántos cupos ya están tomados para un slot específico."""
    q = CitaModel.objects.filter(
        empresa_id=empresa_id,
        fecha=fecha_obj,
        hora_inicio=hora_str,
        estado__in=['CONFIRMADA'],  # Solo citas con pago confirmado bloquean el slot
    )
    if sede_id:
        q = q.filter(sede_id=sede_id)
    # Suma las cantidades (cantidad guardada como notas JSON o campo separado)
    # Por compatibilidad, cada registro = 1 cupo
    return q.count()


def _profesionales_disponibles(empresa_id: str, fecha_obj: date, hora_inicio_str: str, excluir_id=None):
    """Retorna lista de profesionales sin cita en ese horario."""
    ocupados_ids = CitaModel.objects.filter(
        empresa_id=empresa_id,
        fecha=fecha_obj,
        hora_inicio=hora_inicio_str,
        estado__in=['PROGRAMADA', 'CONFIRMADA'],
    ).values_list('profesional_id', flat=True)

    q = ProfesionalModel.objects.filter(empresa_id=empresa_id).exclude(id__in=ocupados_ids)
    if excluir_id:
        q = q.exclude(id=excluir_id)
    return [{'id': str(p.id), 'nombre': p.nombre, 'especialidad': p.especialidad} for p in q]


def _enviar_email_cita(destinatario: str, asunto: str, cuerpo: str):
    """Envía email de notificación. Falla silenciosamente si no está configurado."""
    try:
        send_mail(
            subject=asunto,
            message=cuerpo,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@agenda.app'),
            recipient_list=[destinatario],
            fail_silently=True,
        )
    except Exception:
        pass


# ─── Horarios ────────────────────────────────────────────────────────────────

class HorarioEmpresaController(APIView):
    """GET → obtiene horarios (público). POST → empresa configura SOLO SUS propios horarios (auth + ownership)."""
    permission_classes = [AllowAny]

    def get(self, request, empresa_id):
        # Retorna todos los horarios (activos e inactivos) para que el frontend no pierda los valores configurados
        horarios = HorarioEmpresaModel.objects.filter(empresa_id=empresa_id)
        data = [
            {
                'dia_semana': h.dia_semana,
                'hora_inicio': h.hora_inicio.strftime('%H:%M'),
                'hora_fin': h.hora_fin.strftime('%H:%M'),
                'activo': h.activo,
            }
            for h in horarios
        ]
        return Response({'ok': True, 'datos': data})

    def post(self, request, empresa_id):
        """Recibe lista [{dia_semana, hora_inicio, hora_fin}] y los guarda."""
        # 1. Verificar autenticación
        if not request.user.is_authenticated:
            return Response({'ok': False, 'error': 'Autenticación requerida.'}, status=401)

        # 2. Verificar que la empresa solo pueda editar SUS propios horarios
        empresa_token_id = str(request.user.usuario_id)
        if empresa_token_id != str(empresa_id):
            return Response(
                {'ok': False, 'error': 'No tienes permisos para modificar los horarios de esta empresa.'},
                status=403
            )

        horarios_data = request.data.get('horarios', [])
        if not horarios_data:
            return Response({'ok': False, 'error': 'Se requiere una lista de horarios.'}, status=400)

        for h in horarios_data:
            dia = h.get('dia_semana')
            h_inicio = h.get('hora_inicio')
            h_fin = h.get('hora_fin')
            activo = h.get('activo', True)
            if dia is None or not h_inicio or not h_fin:
                continue
            HorarioEmpresaModel.objects.update_or_create(
                empresa_id=empresa_id,
                dia_semana=dia,
                defaults={
                    'hora_inicio': h_inicio,
                    'hora_fin': h_fin,
                    'activo': activo,
                }
            )
        return Response({'ok': True, 'mensaje': 'Horarios actualizados.'})


# ─── Slots disponibles ────────────────────────────────────────────────────────

class SlotsDisponiblesController(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [SlotsThrottle]  # Máx 60 req/min por IP

    def get(self, request):
        try:
            return self._get(request)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error global en SlotsDisponiblesController")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)

    def _get(self, request):
        empresa_id = request.query_params.get('empresa_id')
        fecha_str = request.query_params.get('fecha')  # 'YYYY-MM-DD'
        servicio_id = request.query_params.get('servicio_id')
        profesional_id = request.query_params.get('profesional_id') or None
        sede_id = request.query_params.get('sede_id') or None  # Nuevo: filtro por sede

        if not all([empresa_id, fecha_str, servicio_id]):
            return Response({'ok': False, 'error': 'empresa_id, fecha y servicio_id son requeridos.'}, status=400)

        try:
            fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'ok': False, 'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}, status=400)

        # Día de la semana: Python weekday() → 0=Lunes
        dia_semana = fecha_obj.weekday()

        # Buscar horario: primero por sede, si no hay, buscar horario base (sede_id=None)
        horario = HorarioEmpresaModel.objects.filter(
            empresa_id=empresa_id, dia_semana=dia_semana, activo=True, sede_id=sede_id
        ).first()
        if not horario and sede_id:
            # Fallback 1: horario base de la empresa (sin sede especifica)
            horario = HorarioEmpresaModel.objects.filter(
                empresa_id=empresa_id, dia_semana=dia_semana, activo=True, sede_id__isnull=True
            ).first()

        if not horario:
            # Fallback 2: si buscó con sede_id=None (o falló el fallback 1) y no lo encontró, buscar CUALQUIER horario activo
            horario = HorarioEmpresaModel.objects.filter(
                empresa_id=empresa_id, dia_semana=dia_semana, activo=True
            ).first()

        if not horario:
            return Response({'ok': True, 'datos': [], 'mensaje': 'No hay horario configurado para este día.'})

        try:
            servicio = ServicioModel.objects.get(id=servicio_id)
            duracion = servicio.duracion_minutos
            capacidad = servicio.capacidad_por_slot
        except ServicioModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Servicio no encontrado.'}, status=404)

        if not duracion or duracion <= 0:
            return Response({'ok': False, 'error': 'Este servicio no tiene una duración válida configurada.'}, status=400)

        try:
            todos_slots = _generar_slots(horario.hora_inicio, horario.hora_fin, duracion)
        except ValueError as e:
            return Response({'ok': False, 'error': f'Horario mal configurado: {str(e)}'}, status=400)
        except Exception as e:
            return Response({'ok': False, 'error': f'Error generando slots: {str(e)}'}, status=500)
            
        ocupados = _slots_ocupados(empresa_id, profesional_id, fecha_obj, sede_id)

        # Calcular cupos disponibles por slot
        disponibles = []
        for slot in todos_slots:
            if slot in ocupados and capacidad == 1:
                continue  # Slot lleno para cita individual
            cupos_usados = _cupos_usados(empresa_id, fecha_obj, slot, sede_id)
            cupos_libres = capacidad - cupos_usados
            if cupos_libres > 0:
                disponibles.append({
                    'hora': slot,
                    'cupos_disponibles': cupos_libres,
                    'capacidad_total': capacidad,
                })

        return Response({'ok': True, 'datos': disponibles})


# ─── Reserva Guest ────────────────────────────────────────────────────────────

class ReservarGuestController(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ReservaGuestThrottle]  # Máx 10 reservas/min por IP — anti-spam

    def post(self, request):
        try:
            return self._procesar_reserva(request)
        except Exception as e:
            import traceback
            print('[ReservarGuestController] ERROR 500:', traceback.format_exc())
            return Response({'ok': False, 'error': f'Error interno: {str(e)}'}, status=500)

    def _procesar_reserva(self, request):
        d = request.data
        empresa_id    = d.get('empresa_id')
        servicio_id   = d.get('servicio_id')
        profesional_id = d.get('profesional_id') or None
        fecha_str     = d.get('fecha')
        hora_inicio_str = d.get('hora_inicio')
        cliente_nombre  = d.get('cliente_nombre', '').strip()
        cliente_telefono = d.get('cliente_telefono', '').strip()
        cliente_email   = d.get('cliente_email', '').strip()
        notas = d.get('notas', '')
        cliente_id = d.get('cliente_id') or None   # Opcional si ya tiene cuenta
        sede_id = d.get('sede_id') or None          # Nuevo: sede donde se agenda
        cantidad = max(1, int(d.get('cantidad', 1)))  # Cupos a reservar
        tipo_plan = d.get('tipo_plan', 'sesion') # 'sesion', '30_dias', '90_dias', '120_dias'

        if not all([empresa_id, servicio_id, fecha_str, hora_inicio_str, cliente_nombre, cliente_telefono]):
            return Response({'ok': False, 'error': 'Faltan campos requeridos.'}, status=400)

        try:
            fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            h_inicio = datetime.strptime(hora_inicio_str, '%H:%M').time()
        except ValueError:
            return Response({'ok': False, 'error': 'Formato de fecha u hora inválido.'}, status=400)

        # Calcular hora_fin según duración del servicio
        try:
            servicio = ServicioModel.objects.get(id=servicio_id)
        except ServicioModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Servicio no encontrado.'}, status=404)

        duracion = servicio.duracion_minutos or 60
        capacidad = servicio.capacidad_por_slot
        h_fin = (datetime.combine(fecha_obj, h_inicio) + timedelta(minutes=duracion)).time()

        # Verificar cupos disponibles
        cupos_usados = _cupos_usados(empresa_id, fecha_obj, hora_inicio_str, sede_id)
        cupos_libres = capacidad - cupos_usados
        if cupos_libres <= 0 or cantidad > cupos_libres:
            alternativos = _profesionales_disponibles(empresa_id, fecha_obj, hora_inicio_str, excluir_id=profesional_id)
            return Response({
                'ok': False,
                'error': f'No hay suficientes cupos. Disponibles: {max(0, cupos_libres)}.',
                'cupos_disponibles': max(0, cupos_libres),
                'alternativos': alternativos,
                'codigo': 'SIN_CUPOS',
            }, status=409)

        cita_id = str(uuid.uuid4())
        # Obtener llaves Wompi de la empresa (BYOG) o del entorno global
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            WOMPI_PUB_KEY = empresa.wompi_public_key or os.environ.get('WOMPI_PUBLIC_KEY', '')
            WOMPI_INTEGRIDAD = empresa.wompi_integrity_key or os.environ.get('WOMPI_INTEGRITY_KEY', '')
        except EmpresaModel.DoesNotExist:
            WOMPI_PUB_KEY = os.environ.get('WOMPI_PUBLIC_KEY', '')
            WOMPI_INTEGRIDAD = os.environ.get('WOMPI_INTEGRITY_KEY', '')

        # Calcular el precio total según el plan seleccionado
        precio_unitario = servicio.precio_valor
        if tipo_plan == '30_dias' and servicio.precio_30_dias is not None:
            precio_unitario = servicio.precio_30_dias
        elif tipo_plan == '90_dias' and servicio.precio_90_dias is not None:
            precio_unitario = servicio.precio_90_dias
        elif tipo_plan == '120_dias' and servicio.precio_120_dias is not None:
            precio_unitario = servicio.precio_120_dias
            
        monto_total = precio_unitario * cantidad

        checkout_url = None
        estado_cita = 'CONFIRMADA'
        estado_pago = 'PAGADO'
        monto_pagado = monto_total

        wompi_ref = f'cita-{cita_id[:8]}-{uuid.uuid4().hex[:6]}'

        if WOMPI_PUB_KEY:
            estado_cita = 'PROGRAMADA'
            estado_pago = 'PENDIENTE'
            monto_pagado = 0
            monto_centavos = int(float(monto_total) * 100)
            cadena_integridad = f'{wompi_ref}{monto_centavos}COP{WOMPI_INTEGRIDAD}'
            firma_integridad = hashlib.sha256(cadena_integridad.encode()).hexdigest()
            checkout_url = (
                f'https://checkout.wompi.co/p/'
                f'?public-key={WOMPI_PUB_KEY}'
                f'&currency=COP'
                f'&amount-in-cents={monto_centavos}'
                f'&reference={wompi_ref}'
                f'&signature:integrity={firma_integridad}'
                f'&redirect-url=https://agenda-pi-bice.vercel.app/pago-exitoso/{cita_id}'
            )

        CitaModel.objects.create(
            id=cita_id,
            empresa_id=empresa_id,
            servicio_id=servicio_id,
            profesional_id=profesional_id,
            sede_id=sede_id,
            fecha=fecha_obj,
            hora_inicio=h_inicio,
            hora_fin=h_fin,
            estado=estado_cita,
            cliente_id=cliente_id,
            cliente_nombre=cliente_nombre,
            cliente_telefono=cliente_telefono,
            cliente_email=cliente_email,
            notas=notas,
            wompi_referencia=wompi_ref,
        )

        # Crear registro de pago pendiente (tolerante a fallos — si la tabla no existe no bloquea la cita)
        pago_id = str(uuid.uuid4())
        try:
            PagoModel.objects.create(
                id=pago_id,
                empresa_id=empresa_id,
                cita_id=cita_id,
                monto_total=monto_total,
                monto_pagado=monto_pagado,
                estado=estado_pago,
            )
        except Exception as pago_err:
            print(f'[ReservarGuestController] AVISO: No se pudo crear PagoModel: {pago_err}')

        # Email desactivado temporalmente para evitar que se quede pensando 1000 horas por timeout SMTP
        # if cliente_email:
        #     _enviar_email_cita(...)

        return Response({
            'ok': True,
            'datos': {
                'cita_id': cita_id,
                'pago_id': pago_id,
                'monto_total': str(monto_total),
                'servicio_nombre': servicio.nombre,
                'fecha': fecha_str,
                'hora_inicio': hora_inicio_str,
                'hora_fin': h_fin.strftime('%H:%M'),
                'estado': estado_cita,
                'checkout_url': checkout_url,
                'wompi_referencia': wompi_ref,
            }
        }, status=201)


# ─── Wompi Webhook ────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class WompiWebhookController(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Wompi envía un POST con firma SHA256 (NO es HMAC).
        Algoritmo de validación oficial Wompi:
          1. Tomar los campos indicados en signature.properties (en orden)
          2. Concatenar sus valores + timestamp del evento + events_secret
          3. Calcular SHA256 de esa cadena
          4. Comparar con X-Event-Checksum (o signature.checksum)
        """
        import logging
        logger = logging.getLogger(__name__)

        body_raw = request.body
        try:
            evento = json.loads(body_raw)
        except Exception:
            return Response({'ok': False, 'error': 'Body inválido.'}, status=400)

        transaccion = evento.get('data', {}).get('transaction', {})
        referencia = transaccion.get('reference', '')
        estado_wompi = transaccion.get('status', '')

        logger.info(f"[Wompi Webhook] referencia={referencia} estado={estado_wompi}")

        try:
            cita = CitaModel.objects.get(wompi_referencia=referencia)
        except CitaModel.DoesNotExist:
            logger.warning(f"[Wompi Webhook] Cita no encontrada para referencia={referencia}")
            return Response({'ok': True})  # Ignorar silenciosamente

        # Obtener secreto de eventos de la empresa (BYOG) o del entorno
        try:
            empresa = EmpresaModel.objects.get(id=cita.empresa_id)
            WOMPI_SECRET = empresa.wompi_events_secret or os.environ.get('WOMPI_EVENTS_SECRET', '')
        except EmpresaModel.DoesNotExist:
            WOMPI_SECRET = os.environ.get('WOMPI_EVENTS_SECRET', '')

        # ── Validar firma SHA256 según documentación oficial de Wompi ──────────
        # Wompi NO usa HMAC. La firma se construye así:
        #   SHA256( concat(valores de signature.properties) + timestamp + secret )
        if WOMPI_SECRET:
            checksum_recibido = (
                request.headers.get('X-Event-Checksum', '')
                or evento.get('signature', {}).get('checksum', '')
            )
            timestamp = str(evento.get('timestamp', ''))
            properties = evento.get('signature', {}).get('properties', [])

            # Construir cadena navegando cada ruta de propiedad (ej: "data.transaction.id")
            cadena = ''
            for prop in properties:
                partes = prop.split('.')
                valor = evento
                for parte in partes:
                    if isinstance(valor, dict):
                        valor = valor.get(parte, '')
                    else:
                        valor = ''
                        break
                cadena += str(valor) if valor is not None else ''
            cadena += timestamp
            cadena += WOMPI_SECRET

            firma_esperada = hashlib.sha256(cadena.encode('utf-8')).hexdigest()
            logger.info(f"[Wompi Webhook] checksum_recibido={checksum_recibido} firma_esperada={firma_esperada}")

            if checksum_recibido and not hmac.compare_digest(checksum_recibido, firma_esperada):
                logger.error(f"[Wompi Webhook] Firma inválida — ignorando evento.")
                return Response({'ok': False, 'error': 'Firma inválida.'}, status=401)

        if estado_wompi == 'APPROVED':
            cita.estado = 'CONFIRMADA'
            cita.save()
            PagoModel.objects.filter(cita_id=cita.id).update(
                estado='PAGADO',
                monto_pagado=transaccion.get('amount_in_cents', 0) / 100,
                metodo_pago_ultimo=transaccion.get('payment_method_type', ''),
            )
            logger.info(f"[Wompi Webhook] Cita {cita.id} CONFIRMADA y pago PAGADO.")
            # Email de confirmación
            if cita.cliente_email:
                _enviar_email_cita(
                    destinatario=cita.cliente_email,
                    asunto='\u2705 \u00a1Tu cita está CONFIRMADA!',
                    cuerpo=(
                        f'Hola {cita.cliente_nombre},\n\n'
                        f'\u00a1Tu pago fue recibido y tu cita está CONFIRMADA!\n\n'
                        f'Fecha: {cita.fecha}\n'
                        f'Hora: {cita.hora_inicio.strftime("%H:%M")}\n\n'
                        f'\u00a1Te esperamos!'
                    )
                )
        elif estado_wompi in ('DECLINED', 'ERROR', 'VOIDED'):
            cita.estado = 'CANCELADA'
            cita.save()
            PagoModel.objects.filter(cita_id=cita.id).update(estado='FALLIDO')
            logger.info(f"[Wompi Webhook] Cita {cita.id} CANCELADA por estado={estado_wompi}.")

        return Response({'ok': True})


# ─── Verificar Pago Wompi (fallback automático) ──────────────────────────────

class VerificarPagoWompiController(APIView):
    """
    GET /api/citas/pago/verificar/?cita_id=<id>

    Fallback automático: el frontend llama este endpoint cuando el cliente
    llega a la pantalla "pago exitoso". Consulta la API de Wompi directamente
    con la referencia guardada en la cita y actualiza el estado si el pago
    fue aprobado. Esto resuelve cualquier caso donde el webhook falló.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        import logging
        import urllib.request
        logger = logging.getLogger(__name__)

        cita_id = request.GET.get('cita_id', '').strip()
        if not cita_id:
            return Response({'ok': False, 'error': 'cita_id requerido.'}, status=400)

        try:
            cita = CitaModel.objects.get(id=cita_id)
        except CitaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Cita no encontrada.'}, status=404)

        # Si ya está confirmada no hay nada que hacer
        if cita.estado == 'CONFIRMADA':
            try:
                pago = PagoModel.objects.get(cita_id=cita_id)
                return Response({'ok': True, 'estado': 'CONFIRMADA', 'pago_estado': pago.estado})
            except PagoModel.DoesNotExist:
                return Response({'ok': True, 'estado': 'CONFIRMADA', 'pago_estado': 'PAGADO'})

        referencia = cita.wompi_referencia
        if not referencia:
            return Response({'ok': False, 'error': 'Sin referencia de pago asociada.'}, status=400)

        # Obtener llaves de la empresa
        try:
            empresa = EmpresaModel.objects.get(id=cita.empresa_id)
            WOMPI_PRIV_KEY = empresa.wompi_events_secret or os.environ.get('WOMPI_PRIVATE_KEY', '')
        except EmpresaModel.DoesNotExist:
            WOMPI_PRIV_KEY = os.environ.get('WOMPI_PRIVATE_KEY', '')

        # Consultar API de Wompi: buscar transacciones por referencia
        try:
            wompi_url = f'https://api.wompi.co/v1/transactions?reference={referencia}'
            req = urllib.request.Request(
                wompi_url,
                headers={
                    'Authorization': f'Bearer {WOMPI_PRIV_KEY}',
                    'Accept': 'application/json',
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            logger.error(f"[VerificarPago] Error consultando Wompi API: {e}")
            return Response({'ok': False, 'error': 'No se pudo verificar con Wompi.'}, status=502)

        transacciones = data.get('data', [])
        if not transacciones:
            return Response({'ok': True, 'estado': cita.estado, 'pago_estado': 'PENDIENTE', 'mensaje': 'Sin transacciones aún.'})

        # Tomar la transacción más reciente
        tx = transacciones[-1]
        estado_wompi = tx.get('status', '')
        logger.info(f"[VerificarPago] cita={cita_id} referencia={referencia} estado_wompi={estado_wompi}")

        if estado_wompi == 'APPROVED':
            cita.estado = 'CONFIRMADA'
            cita.save()
            PagoModel.objects.filter(cita_id=cita.id).update(
                estado='PAGADO',
                monto_pagado=tx.get('amount_in_cents', 0) / 100,
                metodo_pago_ultimo=tx.get('payment_method_type', ''),
            )
            logger.info(f"[VerificarPago] Cita {cita.id} CONFIRMADA automáticamente vía verificación.")
            return Response({'ok': True, 'estado': 'CONFIRMADA', 'pago_estado': 'PAGADO'})

        elif estado_wompi in ('DECLINED', 'ERROR', 'VOIDED'):
            cita.estado = 'CANCELADA'
            cita.save()
            PagoModel.objects.filter(cita_id=cita.id).update(estado='FALLIDO')
            return Response({'ok': True, 'estado': 'CANCELADA', 'pago_estado': 'FALLIDO'})

        return Response({'ok': True, 'estado': cita.estado, 'pago_estado': 'PENDIENTE', 'estado_wompi': estado_wompi})


# ─── Iniciar Pago Wompi ───────────────────────────────────────────────────────

class IniciarPagoWompiController(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Genera la URL de pago de Wompi para la cita indicada.
        Incluye firma de integridad SHA256 para prevenir manipulación del monto.
        """
        cita_id = request.data.get('cita_id')
        if not cita_id:
            return Response({'ok': False, 'error': 'cita_id requerido.'}, status=400)

        try:
            cita = CitaModel.objects.get(id=cita_id, estado='PROGRAMADA')
            pago = PagoModel.objects.get(cita_id=cita_id)
        except CitaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Cita no encontrada o ya confirmada.'}, status=404)
        except PagoModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Registro de pago no encontrado.'}, status=404)

        # Obtener llaves Wompi de la empresa (BYOG) o del entorno global
        try:
            empresa = EmpresaModel.objects.get(id=cita.empresa_id)
            WOMPI_PUB_KEY = empresa.wompi_public_key or os.environ.get('WOMPI_PUBLIC_KEY', '')
            WOMPI_INTEGRIDAD = empresa.wompi_integrity_key or os.environ.get('WOMPI_INTEGRITY_KEY', '')
        except EmpresaModel.DoesNotExist:
            WOMPI_PUB_KEY = os.environ.get('WOMPI_PUBLIC_KEY', '')
            WOMPI_INTEGRIDAD = os.environ.get('WOMPI_INTEGRITY_KEY', '')

        if not WOMPI_PUB_KEY:
            return Response({'ok': False, 'error': 'Pasarela de pago no configurada.'}, status=503)

        referencia = f'cita-{cita_id[:8]}-{uuid.uuid4().hex[:6]}'

        # Guardar referencia en la cita para el webhook
        cita.wompi_referencia = referencia
        cita.save(update_fields=['wompi_referencia'])

        monto_centavos = int(float(pago.monto_total) * 100)

        # Firma de integridad SHA256 — previene manipulación del monto por el cliente
        cadena_integridad = f'{referencia}{monto_centavos}COP{WOMPI_INTEGRIDAD}'
        firma_integridad = hashlib.sha256(cadena_integridad.encode()).hexdigest()

        checkout_url = (
            f'https://checkout.wompi.co/p/'
            f'?public-key={WOMPI_PUB_KEY}'
            f'&currency=COP'
            f'&amount-in-cents={monto_centavos}'
            f'&reference={referencia}'
            f'&signature:integrity={firma_integridad}'
            f'&redirect-url=https://agenda-pi-bice.vercel.app/pago-exitoso/{cita_id}'
        )

        return Response({
            'ok': True,
            'datos': {
                'checkout_url': checkout_url,
                'referencia': referencia,
                'monto_total': str(pago.monto_total),
            }
        })


# ─── Lista citas de la empresa ────────────────────────────────────────────────

class CitasEmpresaController(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa_id = str(request.user.usuario_id)

        # Paginación — evita cargar miles de citas de golpe
        limit = min(int(request.query_params.get('limit', 50)), 100)  # Máx 100 por página
        offset = int(request.query_params.get('offset', 0))
        estado = request.query_params.get('estado')  # Filtro opcional por estado

        qs = CitaModel.objects.filter(empresa_id=empresa_id).order_by('-fecha', '-hora_inicio')
        if estado:
            qs = qs.filter(estado=estado)

        total = qs.count()
        citas = qs[offset:offset + limit]

        try:
            servicios_map = {s.id: s.nombre for s in ServicioModel.objects.filter(empresa_id=empresa_id)}
            profesionales_map = {p.id: p.nombre for p in ProfesionalModel.objects.filter(empresa_id=empresa_id)}
        except Exception:
            servicios_map = {}
            profesionales_map = {}

        datos = [
            {
                'id': c.id,
                'empresa_id': str(c.empresa_id),
                'servicio_id': str(c.servicio_id),
                'fecha': str(c.fecha),
                'hora_inicio': c.hora_inicio.strftime('%H:%M'),
                'hora_fin': c.hora_fin.strftime('%H:%M'),
                'estado': c.estado,
                'servicio_nombre': servicios_map.get(c.servicio_id, c.servicio_id),
                'profesional_nombre': profesionales_map.get(c.profesional_id, 'Cualquiera'),
                'cliente_nombre': c.cliente_nombre or 'Cliente registrado',
                'cliente_telefono': c.cliente_telefono,
                'cliente_email': c.cliente_email,
                'notas': c.notas,
            }
            for c in citas
        ]
        return Response({
            'ok': True,
            'total': total,
            'limit': limit,
            'offset': offset,
            'datos': datos,
        })




# --- Citas del Cliente (seguro: requiere JWT de cliente) ---

class CitasClienteController(APIView):
    permission_classes = [AllowAny]

    def _validar_token_cliente(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None, 'Token de autenticacion requerido'
        raw_token = auth_header.split(' ', 1)[1]
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token_obj = AccessToken(raw_token)
            if token_obj.get('rol') not in ('cliente',):
                return None, 'Acceso denegado: se requiere cuenta de cliente'
            return token_obj.get('user_id') or token_obj.get('usuario_id'), None
        except Exception:
            return None, 'Token invalido o expirado'

    def get(self, request):
        token_user_id, error = self._validar_token_cliente(request)
        if error:
            return Response({'ok': False, 'error': error}, status=401)
        cliente_id = request.GET.get('cliente_id', '').strip()
        if not cliente_id:
            return Response({'ok': False, 'error': 'cliente_id requerido'}, status=400)
        if str(token_user_id) != str(cliente_id):
            return Response({'ok': False, 'error': 'Acceso denegado'}, status=403)
        # Solo mostrar citas pagadas: CONFIRMADA o COMPLETADA
        # Las PROGRAMADA son reservas sin pago y no deben aparecer
        citas = CitaModel.objects.filter(
            cliente_id=cliente_id,
            estado__in=['CONFIRMADA', 'COMPLETADA'],
        ).order_by('-fecha', '-hora_inicio')[:50]
        servicios_map = {}
        empresas_map = {}
        try:
            for serv in ServicioModel.objects.all():
                servicios_map[str(serv.id)] = serv.nombre
            for emp in EmpresaModel.objects.all():
                empresas_map[str(emp.id)] = emp.nombre_empresa
        except Exception:
            pass
        citas_ids = [str(c.id) for c in citas]
        pagos_map = {}
        try:
            pagos = PagoModel.objects.filter(cita_id__in=citas_ids)
            for p in pagos:
                pagos_map[str(p.cita_id)] = float(p.monto_total)
        except Exception:
            pass

        datos = [{'id': str(c.id), 'fecha': str(c.fecha), 'hora_inicio': c.hora_inicio.strftime('%H:%M'), 'hora_fin': c.hora_fin.strftime('%H:%M') if c.hora_fin else '', 'estado': c.estado, 'servicio_nombre': servicios_map.get(str(c.servicio_id), 'Servicio'), 'empresa_nombre': empresas_map.get(str(c.empresa_id), 'Empresa'), 'monto': pagos_map.get(str(c.id), 0)} for c in citas]
        return Response({'ok': True, 'datos': datos, 'total': len(datos)})


# ─── Gestión de cita: cancelar / reprogramar ─────────────────────────────────

class GestionCitaController(APIView):
    """
    PATCH /api/citas/<cita_id>/cancelar/    → cambia estado a CANCELADA
    PATCH /api/citas/<cita_id>/reprogramar/ → cambia fecha y hora
    Solo la empresa dueña de la cita puede operar sobre ella.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, cita_id, accion):
        empresa_id = str(request.user.usuario_id)

        try:
            cita = CitaModel.objects.get(id=cita_id, empresa_id=empresa_id)
        except CitaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Cita no encontrada o sin permisos.'}, status=404)

        if accion == 'cancelar':
            if cita.estado == 'CANCELADA':
                return Response({'ok': False, 'error': 'La cita ya está cancelada.'}, status=400)
            cita.estado = 'CANCELADA'
            cita.save(update_fields=['estado'])
            return Response({'ok': True, 'mensaje': 'Cita cancelada correctamente.'})

        elif accion == 'reprogramar':
            nueva_fecha = request.data.get('fecha')
            nueva_hora = request.data.get('hora_inicio')

            if not nueva_fecha or not nueva_hora:
                return Response({'ok': False, 'error': 'fecha y hora_inicio son requeridos.'}, status=400)

            try:
                fecha_obj = datetime.strptime(nueva_fecha, '%Y-%m-%d').date()
                h_inicio = datetime.strptime(nueva_hora, '%H:%M').time()
            except ValueError:
                return Response({'ok': False, 'error': 'Formato de fecha u hora inválido.'}, status=400)

            try:
                servicio = ServicioModel.objects.get(id=cita.servicio_id)
                duracion = servicio.duracion_minutos or 60
            except ServicioModel.DoesNotExist:
                duracion = 60

            h_fin = (datetime.combine(fecha_obj, h_inicio) + timedelta(minutes=duracion)).time()

            cita.fecha = fecha_obj
            cita.hora_inicio = h_inicio
            cita.hora_fin = h_fin
            cita.save(update_fields=['fecha', 'hora_inicio', 'hora_fin'])
            return Response({'ok': True, 'mensaje': 'Cita reprogramada correctamente.'})

        return Response({'ok': False, 'error': f'Acción "{accion}" no válida.'}, status=400)

