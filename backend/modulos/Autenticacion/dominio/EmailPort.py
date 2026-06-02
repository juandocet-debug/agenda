"""
EmailPort.py — Puerto del dominio para envío de emails.
Abstracción que desacopla el dominio de cualquier librería de email concreta.
"""
from abc import ABC, abstractmethod


class EmailPort(ABC):

    @abstractmethod
    def enviar(self, destinatario: str, asunto: str, cuerpo_html: str) -> None:
        """
        Envía un email.
        Lanza Exception si falla el envío.
        """
        pass
