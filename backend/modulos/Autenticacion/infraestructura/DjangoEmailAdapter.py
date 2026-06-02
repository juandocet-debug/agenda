"""
DjangoEmailAdapter.py — Implementación del EmailPort usando django.core.mail.

Usa la configuración SMTP definida en settings.py (variables de entorno de Railway).
Si EMAIL_HOST_USER no está configurado, lanza una excepción descriptiva.
"""
from django.core.mail import send_mail
from django.conf import settings

from modulos.Autenticacion.dominio.EmailPort import EmailPort


class DjangoEmailAdapter(EmailPort):

    def enviar(self, destinatario: str, asunto: str, cuerpo_html: str) -> None:
        remitente = settings.DEFAULT_FROM_EMAIL
        if not remitente or remitente == 'noreply@agenda.app' and not settings.EMAIL_HOST_USER:
            raise Exception(
                "El servidor de email no está configurado. "
                "Define EMAIL_HOST_USER y EMAIL_HOST_PASSWORD en las variables de entorno de Railway."
            )
        send_mail(
            subject=asunto,
            message='',                    # Texto plano vacío — usamos solo HTML
            from_email=remitente,
            recipient_list=[destinatario],
            html_message=cuerpo_html,
            fail_silently=False,
        )
