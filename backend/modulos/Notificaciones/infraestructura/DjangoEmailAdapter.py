import logging
from django.core.mail import send_mail
from django.conf import settings
from modulos.Notificaciones.dominio.NotificacionPort import NotificacionPort
from modulos.Notificaciones.dominio.Entidades import Mensaje

logger = logging.getLogger(__name__)

class DjangoEmailAdapter(NotificacionPort):
    def enviar(self, mensaje: Mensaje) -> bool:
        if mensaje.tipo != "EMAIL":
            return False

        try:
            send_mail(
                subject=mensaje.asunto,
                message=mensaje.cuerpo,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@agendapro.com'),
                recipient_list=[mensaje.destinatario],
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error("Error enviando email a %s: %s", mensaje.destinatario, e)
            return False
