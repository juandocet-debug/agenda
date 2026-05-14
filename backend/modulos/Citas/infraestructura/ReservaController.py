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
    actual = datetime.combine(date.today(), hora_inicio)
    fin = datetime.combine(date.today(), hora_fin)
    while actual + timedelta(minutes=duracion_min) <= fin:
        slots.append(actual.strftime('%H:%M'))
        actual += timedelta(minutes=duracion_min)
    return slots


def _slots_ocupados(empresa_id: str, profesional_id, fecha_obj: date):
    """Retorna set de strings 'HH:MM' ya reservados."""
    q = CitaModel.objects.filter(
        empresa_id=empresa_id,
        fecha=fecha_obj,
        estado__in=['PROGRAMADA', 'CONFIRMADA'],
    )
    if profesional_id:
        q = q.filter(profesional_id=profesional_id)
    return {c.hora_inicio.strftime('%H:%M') for c in q}


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
        empresa_id = request.query_params.get('empresa_id')
        fecha_str = request.query_params.get('fecha')          # 'YYYY-MM-DD'
        servicio_id = request.query_params.get('servicio_id')
        profesional_id = request.query_params.get('profesional_id') or None

        if not all([empresa_id, fecha_str, servicio_id]):
            return Response({'ok': False, 'error': 'empresa_id, fecha y servicio_id son requeridos.'}, status=400)

        try:
            fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'ok': False, 'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}, status=400)

        # Día de la semana: Python weekday() → 0=Lunes
        dia_semana = fecha_obj.weekday()

        horario = HorarioEmpresaModel.objects.filter(
            empresa_id=empresa_id, dia_semana=dia_semana, activo=True
        ).first()

        if not horario:
            return Response({'ok': True, 'datos': [], 'mensaje': 'No hay horario configurado para este día.'})

        try:
            servicio = ServicioModel.objects.get(id=servicio_id)
            duracion = servicio.duracion_minutos
        except ServicioModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Servicio no encontrado.'}, status=404)

        todos_slots = _generar_slots(horario.hora_inicio, horario.hora_fin, duracion)
        ocupados = _slots_ocupados(empresa_id, profesional_id, fecha_obj)
        disponibles = [s for s in todos_slots if s not in ocupados]

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

        h_fin = (datetime.combine(fecha_obj, h_inicio) + timedelta(minutes=servicio.duracion_minutos)).time()

        # Verificar traslape — si hay conflicto, sugerir profesionales disponibles
        ocupados = _slots_ocupados(empresa_id, profesional_id, fecha_obj)
        if hora_inicio_str in ocupados:
            alternativos = _profesionales_disponibles(empresa_id, fecha_obj, hora_inicio_str, excluir_id=profesional_id)
            return Response({
                'ok': False,
                'error': 'Ese horario ya fue reservado para este profesional.',
                'alternativos': alternativos,
                'codigo': 'TRASLAPE',
            }, status=409)

        cita_id = str(uuid.uuid4())
        wompi_ref = f'cita-{cita_id[:8]}-{uuid.uuid4().hex[:6]}'
        CitaModel.objects.create(
            id=cita_id,
            empresa_id=empresa_id,
            servicio_id=servicio_id,
            profesional_id=profesional_id,
            fecha=fecha_obj,
            hora_inicio=h_inicio,
            hora_fin=h_fin,
            estado='PROGRAMADA',
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
                monto_total=servicio.precio_valor,
                monto_pagado=0,
                estado='PENDIENTE',
            )
        except Exception as pago_err:
            print(f'[ReservarGuestController] AVISO: No se pudo crear PagoModel: {pago_err}')
            # La cita ya fue creada. El error de pago no debe bloquear la reserva.

        # Email de confirmación al cliente (programada, pendiente de pago)
        if cliente_email:
            _enviar_email_cita(
                destinatario=cliente_email,
                asunto='Tu cita ha sido programada',
                cuerpo=(
                    f'Hola {cliente_nombre},\n\n'
                    f'Tu cita para {servicio.nombre} el {fecha_str} a las {hora_inicio_str} '
                    f'ha sido programada.\n\n'
                    f'Estado: PROGRAMADA (pendiente de pago)\n'
                    f'Una vez confirmado el pago, recibirás otro email de confirmación.\n\n'
                    f'¡Gracias!'
                )
            )

        # Generar URL de pago Wompi (BYOG)
        checkout_url = None
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            WOMPI_PUB_KEY = empresa.wompi_public_key
            WOMPI_INTEGRIDAD = empresa.wompi_integrity_key
            
            if WOMPI_PUB_KEY:
                monto_centavos = int(float(servicio.precio_valor) * 100)
                
                # Firma de integridad: SHA256(referencia + monto + moneda + llave_integridad)
                cadena_integridad = f'{wompi_ref}{monto_centavos}COP{WOMPI_INTEGRIDAD or ""}'
                firma_integridad = hashlib.sha256(cadena_integridad.encode()).hexdigest()

                checkout_url = (
                    f'https://checkout.wompi.co/p/'
                    f'?public-key={WOMPI_PUB_KEY}'
                    f'&currency=COP'
                    f'&amount-in-cents={monto_centavos}'
                    f'&reference={wompi_ref}'
                    f'&signature:integrity={firma_integridad}'
                    f'&redirect-url=agendaapp://pago-exitoso/{cita_id}'
                )
        except EmpresaModel.DoesNotExist:
            pass

        return Response({
            'ok': True,
            'datos': {
                'cita_id': cita_id,
                'pago_id': pago_id,
                'monto_total': str(servicio.precio_valor),
                'servicio_nombre': servicio.nombre,
                'fecha': fecha_str,
                'hora_inicio': hora_inicio_str,
                'hora_fin': h_fin.strftime('%H:%M'),
                'estado': 'PROGRAMADA',
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
        Wompi envía un POST con firma HMAC-SHA256.
        Verifica la firma y actualiza el estado de la cita.
        """
        body_raw = request.body
        try:
            evento = json.loads(body_raw)
        except Exception:
            return Response({'ok': False, 'error': 'Body inválido.'}, status=400)

        transaccion = evento.get('data', {}).get('transaction', {})
        referencia = transaccion.get('reference', '')
        estado_wompi = transaccion.get('status', '')

        try:
            cita = CitaModel.objects.get(wompi_referencia=referencia)
        except CitaModel.DoesNotExist:
            return Response({'ok': True}) # Ignorar silenciosamente

        # Obtener secreto de la empresa para validar (BYOG)
        try:
            empresa = EmpresaModel.objects.get(id=cita.empresa_id)
            WOMPI_SECRET = empresa.wompi_events_secret
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada.'}, status=404)

        # Verificar firma HMAC-SHA256
        checksum = request.headers.get('X-Event-Checksum', '')
        if WOMPI_SECRET:
            firma_esperada = hmac.new(
                WOMPI_SECRET.encode(),
                body_raw,
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(checksum, firma_esperada):
                return Response({'ok': False, 'error': 'Firma inválida.'}, status=401)

        if estado_wompi == 'APPROVED':
            cita.estado = 'CONFIRMADA'
            cita.save()
            PagoModel.objects.filter(cita_id=cita.id).update(
                estado='PAGADO',
                monto_pagado=transaccion.get('amount_in_cents', 0) / 100,
                metodo_pago_ultimo=transaccion.get('payment_method_type', ''),
            )
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

        return Response({'ok': True})


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
            f'&redirect-url=agendaapp://pago-exitoso/{cita_id}'
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
