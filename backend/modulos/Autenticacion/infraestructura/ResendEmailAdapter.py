"""
ResendEmailAdapter.py — Implementación del EmailPort usando la API HTTP de Resend.

Usa HTTPS (puerto 443) en vez de SMTP — funciona en Railway sin restricciones.
Requiere la variable de entorno RESEND_API_KEY.
"""
import resend
from django.conf import settings
from modulos.Autenticacion.dominio.EmailPort import EmailPort


class ResendEmailAdapter(EmailPort):

    def enviar(self, destinatario: str, asunto: str, cuerpo_html: str) -> None:
        api_key = getattr(settings, 'RESEND_API_KEY', '')
        if not api_key:
            raise Exception(
                "RESEND_API_KEY no está configurada en las variables de entorno."
            )

        resend.api_key = api_key

        resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [destinatario],
            "subject": asunto,
            "html": cuerpo_html,
        })
