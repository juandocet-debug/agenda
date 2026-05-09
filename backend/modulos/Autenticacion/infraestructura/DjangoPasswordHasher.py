from django.contrib.auth.hashers import make_password, check_password
from modulos.Autenticacion.dominio.PasswordHasherPort import PasswordHasherPort

class DjangoPasswordHasher(PasswordHasherPort):
    def hash(self, plain_text: str) -> str:
        return make_password(plain_text)

    def verify(self, plain_text: str, hashed_text: str) -> bool:
        return check_password(plain_text, hashed_text)
