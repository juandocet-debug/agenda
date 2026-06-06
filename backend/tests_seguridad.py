"""
tests_seguridad.py — Tests de seguridad para endpoints críticos.

Cubre:
  - C-1: IDOR en ServicioController (empresa_id del JWT, no del body)
  - C-2: IDOR en PagoController (ownership verification)
  - C-3: DetalleEmpresaPrivadoController no expone secretos Wompi
  - A-1: LoginController throttle activo
"""
import uuid
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from modulos.Autenticacion.infraestructura.models import CredencialModel
from modulos.Citas.infraestructura.models import CitaModel
from modulos.Pagos.infraestructura.models import PagoModel
from modulos.Empresas.infraestructura.models import EmpresaModel


def _crear_credencial(rol='empresa'):
    """Helper: crea una credencial y devuelve (usuario_id, token_access)."""
    uid = str(uuid.uuid4())
    CredencialModel.objects.create(
        usuario_id=uid,
        username=f'user_{uid[:8]}',
        email=f'{uid[:8]}@test.com',
        password_hash='pbkdf2_sha256$fake$hash',
        activo=True,
        rol=rol,
    )
    refresh = RefreshToken()
    refresh['user_id'] = uid
    refresh['email'] = f'{uid[:8]}@test.com'
    refresh['rol'] = rol
    return uid, str(refresh.access_token)


def _crear_cita(empresa_id, cliente_id=None):
    """Helper: crea una cita mínima."""
    cita_id = str(uuid.uuid4())
    CitaModel.objects.create(
        id=cita_id,
        empresa_id=empresa_id,
        servicio_id=str(uuid.uuid4()),
        cliente_id=cliente_id or str(uuid.uuid4()),
        fecha='2026-07-01',
        hora_inicio='10:00',
        hora_fin='11:00',
        estado='PROGRAMADA',
    )
    return cita_id


# ═══════════════════════════════════════════════════════════════════════════
# C-1: ServicioController — empresa_id del JWT, no del body
# ═══════════════════════════════════════════════════════════════════════════

class TestServicioControllerIDOR(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa_id, self.empresa_token = _crear_credencial('empresa')
        self.cliente_id, self.cliente_token = _crear_credencial('cliente')
        self.otra_empresa_id, self.otra_token = _crear_credencial('empresa')

    def test_cliente_no_puede_crear_servicio(self):
        """Un cliente NO debe poder crear servicios (rol incorrecto)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.cliente_token}')
        res = self.client.post('/api/servicios/', {
            'empresa_id': self.empresa_id,  # Intenta usar empresa_id ajeno
            'nombre': 'Corte hacker',
            'precio': 50000,
            'tipo_servicio': 'CITA',
            'duracion': 30,
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_empresa_crea_servicio_con_su_propio_id(self):
        """La empresa crea un servicio y el empresa_id viene del JWT, no del body."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.empresa_token}')
        res = self.client.post('/api/servicios/', {
            'empresa_id': self.otra_empresa_id,  # Intenta inyectar otro ID
            'nombre': 'Corte de pelo',
            'precio': 25000,
            'tipo_servicio': 'CITA',
            'duracion': 30,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        # El servicio fue creado con el empresa_id del JWT, NO el del body
        from modulos.Servicios.infraestructura.models import ServicioModel
        servicio_id = res.json()['datos']['servicio_id']
        servicio = ServicioModel.objects.get(id=servicio_id)
        self.assertEqual(str(servicio.empresa_id), self.empresa_id)
        self.assertNotEqual(str(servicio.empresa_id), self.otra_empresa_id)


# ═══════════════════════════════════════════════════════════════════════════
# C-2: PagoController — ownership verification
# ═══════════════════════════════════════════════════════════════════════════

class TestPagoControllerIDOR(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa_id, self.empresa_token = _crear_credencial('empresa')
        self.cliente_id, self.cliente_token = _crear_credencial('cliente')
        self.atacante_id, self.atacante_token = _crear_credencial('cliente')
        self.cita_id = _crear_cita(self.empresa_id, self.cliente_id)
        # Crear pago asociado a la cita
        PagoModel.objects.create(
            id=str(uuid.uuid4()),
            empresa_id=self.empresa_id,
            cita_id=self.cita_id,
            monto_total=50000,
            monto_pagado=0,
            estado='PENDIENTE',
        )

    def test_empresa_puede_ver_pago_de_su_cita(self):
        """La empresa dueña de la cita puede consultar el pago."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.empresa_token}')
        res = self.client.get(f'/api/pagos/{self.cita_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['ok'])

    def test_cliente_puede_ver_pago_de_su_cita(self):
        """El cliente de la cita puede consultar su propio pago."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.cliente_token}')
        res = self.client.get(f'/api/pagos/{self.cita_id}/')
        self.assertEqual(res.status_code, 200)

    def test_atacante_no_puede_ver_pago_ajeno(self):
        """Otro usuario NO puede consultar pagos de citas ajenas."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.atacante_token}')
        res = self.client.get(f'/api/pagos/{self.cita_id}/')
        self.assertEqual(res.status_code, 403)

    def test_atacante_no_puede_registrar_abono_ajeno(self):
        """Otro usuario NO puede registrar abonos en citas ajenas."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.atacante_token}')
        res = self.client.post(f'/api/pagos/{self.cita_id}/', {
            'cantidad': 10000,
            'metodo_pago': 'EFECTIVO',
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_sin_autenticacion_rechazado(self):
        """Sin token, el acceso es denegado."""
        res = self.client.get(f'/api/pagos/{self.cita_id}/')
        self.assertEqual(res.status_code, 401)


# ═══════════════════════════════════════════════════════════════════════════
# C-3: DetalleEmpresaPrivadoController — no expone secretos
# ═══════════════════════════════════════════════════════════════════════════

class TestEmpresaNoExponeSescretos(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.empresa_id, self.empresa_token = _crear_credencial('empresa')
        EmpresaModel.objects.create(
            id=self.empresa_id,
            nombre='Test Corp',
            slug='test-corp',
            wompi_public_key='pub_test_123',
            wompi_integrity_key='integrity_secret_456',
            wompi_events_secret='events_secret_789',
        )

    def test_no_devuelve_integrity_key(self):
        """El endpoint privado NO debe devolver wompi_integrity_key."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.empresa_token}')
        res = self.client.get(f'/api/empresas/detalle/{self.empresa_id}/')
        data = res.json().get('datos', {})
        self.assertNotIn('wompi_integrity_key', data)
        self.assertNotIn('wompi_events_secret', data)

    def test_devuelve_wompi_configurado_boolean(self):
        """El endpoint devuelve 'wompi_configurado' como boolean."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.empresa_token}')
        res = self.client.get(f'/api/empresas/detalle/{self.empresa_id}/')
        data = res.json().get('datos', {})
        self.assertIn('wompi_configurado', data)
        self.assertTrue(data['wompi_configurado'])


# ═══════════════════════════════════════════════════════════════════════════
# A-1: LoginController — throttle verificación
# ═══════════════════════════════════════════════════════════════════════════

@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
)
class TestLoginThrottle(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_tiene_throttle(self):
        """Después de 10 intentos fallidos, el 11° debe ser rechazado (429)."""
        for i in range(11):
            res = self.client.post('/api/auth/login/', {
                'email': 'noexiste@test.com',
                'password': 'wrong',
            }, format='json')
        # El último debería ser 429 Too Many Requests
        self.assertEqual(res.status_code, 429)
