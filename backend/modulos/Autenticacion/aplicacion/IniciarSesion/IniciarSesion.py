from modulos.Autenticacion.dominio.AutenticacionRepositoryPort import AutenticacionRepositoryPort
from modulos.Autenticacion.dominio.PasswordHasherPort import PasswordHasherPort

class IniciarSesion:
    def __init__(self, repo: AutenticacionRepositoryPort, hasher: PasswordHasherPort):
        self.repo = repo
        self.hasher = hasher

    def run(self, identificador: str, password_plano: str) -> tuple:
        """
        Devuelve (usuario_id, rol) si el login es exitoso.
        Lanza ValueError si falla.
        """
        credencial = self.repo.obtener_por_email(identificador)
        if not credencial:
            credencial = self.repo.obtener_por_username(identificador)
            
        if not credencial:
            raise ValueError("Credenciales inválidas.")
            
        if not credencial.activo:
            raise ValueError("El usuario está desactivado.")
            
        # Detectar cuentas creadas solo con Google (sin contraseña manual)
        if credencial.password_hash.value == 'google-oauth2-no-password':
            raise ValueError("Esta cuenta fue creada con Google. Usa el botón 'Continuar con Google' para ingresar.")

        es_valido = self.hasher.verify(password_plano, credencial.password_hash.value)
        if not es_valido:
            raise ValueError("Contraseña incorrecta. Verifica tu contraseña e intenta de nuevo.")
            
        return (credencial.usuario_id, credencial.rol)
