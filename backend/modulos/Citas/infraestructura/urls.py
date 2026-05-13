from django.urls import path
from .CitaController import AgendarCitaController
from .ReservaController import (
    HorarioEmpresaController,
    SlotsDisponiblesController,
    ReservarGuestController,
    WompiWebhookController,
    IniciarPagoWompiController,
    CitasEmpresaController,
)

urlpatterns = [
    # Flujo legado (empresa agenda manualmente)
    path('agendar/', AgendarCitaController.as_view(), name='agendar_cita'),

    # Horarios de la empresa
    path('horario/<str:empresa_id>/', HorarioEmpresaController.as_view(), name='horario_empresa'),

    # Slots disponibles (público)
    path('slots/', SlotsDisponiblesController.as_view(), name='slots_disponibles'),

    # Reserva sin registro (guest)
    path('reservar-guest/', ReservarGuestController.as_view(), name='reservar_guest'),

    # Pago Wompi
    path('pago/iniciar/', IniciarPagoWompiController.as_view(), name='iniciar_pago_wompi'),
    path('pago/webhook/', WompiWebhookController.as_view(), name='wompi_webhook'),

    # Panel empresa: ver sus citas
    path('mis-citas/', CitasEmpresaController.as_view(), name='citas_empresa'),
]

