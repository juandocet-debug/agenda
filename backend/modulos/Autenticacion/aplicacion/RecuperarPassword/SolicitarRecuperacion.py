"""
SolicitarRecuperacion.py — Caso de uso: el usuario solicita recuperar su contraseña.

Flujo:
  1. Normalizar y validar el email recibido.
  2. Verificar que existe una cuenta activa con ese email.
  3. Generar un token criptográficamente seguro (secrets.token_urlsafe).
  4. Calcular la fecha de expiración (30 minutos).
  5. Persistir el token vía el repositorio (port).
  6. Enviar el email con el link usando el EmailPort.

Principio de seguridad: si el email NO existe, la respuesta al frontend
es idéntica a cuando SÍ existe (no revelar si un email está registrado).
"""
import secrets
from datetime import datetime, timedelta, timezone

from modulos.Autenticacion.dominio.AutenticacionRepositoryPort import AutenticacionRepositoryPort
from modulos.Autenticacion.dominio.PasswordResetRepositoryPort import PasswordResetRepositoryPort, PasswordResetToken
from modulos.Autenticacion.dominio.EmailPort import EmailPort


_EXPIRACION_MINUTOS = 30
_FRONTEND_URL = 'https://agenda-pi-bice.vercel.app'


class SolicitarRecuperacion:
    def __init__(
        self,
        auth_repo: AutenticacionRepositoryPort,
        reset_repo: PasswordResetRepositoryPort,
        email_port: EmailPort,
    ):
        self.auth_repo = auth_repo
        self.reset_repo = reset_repo
        self.email_port = email_port

    def run(self, email_raw: str) -> None:
        """
        Genera y envía el token de recuperación.
        No lanza excepción si el email no existe (seguridad anti-enumeración).
        """
        email = email_raw.strip().lower()

        credencial = self.auth_repo.obtener_por_email(email)
        if not credencial or not credencial.activo:
            # Respuesta silenciosa — no revelar si el email existe
            return

        # Token de 32 bytes en base64 url-safe → 43 caracteres alfanuméricos
        token_str = secrets.token_urlsafe(32)
        ahora = datetime.now(timezone.utc)
        expira = ahora + timedelta(minutes=_EXPIRACION_MINUTOS)

        reset_token = PasswordResetToken(
            token=token_str,
            email=email,
            creado_en=ahora,
            expira_en=expira,
            usado=False,
        )
        self.reset_repo.guardar_token(reset_token)

        # Construir link de recuperación según el rol
        link = f"{_FRONTEND_URL}/reset-password/{token_str}"

        tipo_cuenta = "empresa" if credencial.rol == "empresa" else "cliente"
        cuerpo_html = _construir_email_html(link, tipo_cuenta, _EXPIRACION_MINUTOS)

        self.email_port.enviar(
            destinatario=email,
            asunto="Recupera el acceso a tu cuenta — Flowy",
            cuerpo_html=cuerpo_html,
        )


def _construir_email_html(link: str, tipo_cuenta: str, minutos: int) -> str:
    titulo = "Recupera el acceso a tu negocio" if tipo_cuenta == "empresa" else "Recupera tu contraseña"
    descripcion = (
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta de empresa en Flowy."
        if tipo_cuenta == "empresa"
        else "Recibimos una solicitud para restablecer la contraseña de tu cuenta en Flowy."
    )
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#F0F2FF;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(44,91,238,.10);">
            <tr>
              <td style="background:linear-gradient(135deg,#4C5BEE,#2B5BEE);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">🔐 Flowy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;">{titulo}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">{descripcion}</p>
                <p style="margin:0 0 28px;color:#64748B;font-size:14px;line-height:1.6;">
                  Este link es válido por <strong>{minutos} minutos</strong> y solo puede usarse una vez.
                </p>
                <div style="text-align:center;">
                  <a href="{link}"
                     style="display:inline-block;background:#2B5BEE;color:#fff;font-weight:700;font-size:15px;
                            padding:14px 36px;border-radius:50px;text-decoration:none;letter-spacing:.3px;">
                    Restablecer contraseña
                  </a>
                </div>
                <p style="margin:28px 0 0;color:#94A3B8;font-size:12px;text-align:center;line-height:1.6;">
                  Si no solicitaste esto, ignora este email. Tu contraseña no cambiará.<br>
                  Por seguridad, nunca compartas este link con nadie.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:#F8FAFC;text-align:center;">
                <p style="margin:0;color:#CBD5E1;font-size:11px;">© 2025 Flowy — Todos los derechos reservados</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
