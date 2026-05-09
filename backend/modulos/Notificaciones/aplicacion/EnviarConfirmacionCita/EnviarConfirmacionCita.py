from modulos.Notificaciones.dominio.NotificacionPort import NotificacionPort
from modulos.Notificaciones.dominio.Entidades import Mensaje

class EnviarConfirmacionCita:
    def __init__(self, email_port: NotificacionPort):
        self.email_port = email_port

    def run(self, email_cliente: str, fecha_cita: str, nombre_servicio: str):
        cuerpo = f"Hola, tu cita para '{nombre_servicio}' el {fecha_cita} ha sido agendada exitosamente."
        
        mensaje = Mensaje(
            destinatario=email_cliente,
            asunto="Confirmación de tu Cita - Agenda Pro",
            cuerpo=cuerpo,
            tipo="EMAIL"
        )
        
        self.email_port.enviar(mensaje)
