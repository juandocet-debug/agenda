from datetime import date, time
from typing import Optional

from modulos.Citas.dominio.ValueObjects import Horario
from modulos.Citas.dominio.Entidades import Cita
from modulos.Citas.dominio.CitaRepositoryPort import CitaRepositoryPort
from modulos.Notificaciones.dominio.NotificacionPort import NotificacionPort
from modulos.Notificaciones.dominio.Entidades import Mensaje

class AgendarCita:
    def __init__(self, cita_repository: CitaRepositoryPort, notificacion_port: Optional[NotificacionPort] = None):
        # Inyección de dependencias
        self.cita_repository = cita_repository
        self.notificacion_port = notificacion_port

    def run(
        self, 
        empresa_id: str,
        cliente_id: str, 
        asesor_id: str, 
        servicio_id: str, 
        fecha: date, 
        hora_inicio: time, 
        hora_fin: time, 
        notas: Optional[str] = None
    ) -> Cita:
        
        # 1. Crear el Value Object de Horario (Valida la coherencia de las horas)
        horario = Horario(fecha=fecha, hora_inicio=hora_inicio, hora_fin=hora_fin)
        
        # 2. Lógica de Dominio/Aplicación: Validar solapamiento de citas para el asesor
        citas_del_dia = self.cita_repository.listar_por_asesor_y_fecha(asesor_id, fecha)
        for cita_existente in citas_del_dia:
            if cita_existente.estado.value != "CANCELADA":
                h_existente = cita_existente.horario
                # Hay solapamiento si la nueva cita inicia antes de que termine la existente 
                # Y termina después de que la existente haya iniciado.
                if hora_inicio < h_existente.hora_fin and hora_fin > h_existente.hora_inicio:
                    raise ValueError("El asesor ya tiene una cita reservada en ese horario.")

        # 3. Crear la entidad Cita a través de su método de fábrica
        nueva_cita = Cita.agendar_nueva(
            empresa_id=empresa_id,
            cliente_id=cliente_id,
            asesor_id=asesor_id,
            servicio_id=servicio_id,
            horario=horario,
            notas=notas
        )
        
        # 4. Persistir la cita usando el puerto (abstracción)
        self.cita_repository.guardar(nueva_cita)
        
        # 5. Enviar Notificación si el puerto está configurado
        if self.notificacion_port:
            # En un entorno real se buscaría el email del cliente y el nombre del servicio
            # Simularemos con un correo genérico para la prueba arquitectónica.
            mensaje = Mensaje(
                destinatario=f"cliente_{cliente_id}@ejemplo.com", 
                asunto="Confirmación de tu Cita",
                cuerpo=f"Tu cita ha sido agendada para el {fecha} a las {hora_inicio}.",
                tipo="EMAIL"
            )
            self.notificacion_port.enviar(mensaje)
        
        return nueva_cita
