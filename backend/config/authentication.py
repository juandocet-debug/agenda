from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from modulos.Autenticacion.infraestructura.models import CredencialModel

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Sobrescribe el método por defecto para buscar el usuario
        en nuestro CredencialModel usando el claim 'user_id'
        que inyectamos durante el login.
        """
        try:
            user_id = validated_token.get('user_id')
            if not user_id:
                raise InvalidToken('El token no contiene el user_id')
            
            # Buscamos en nuestra tabla auth_credenciales
            user = CredencialModel.objects.get(usuario_id=user_id)
            
            if not user.activo:
                raise AuthenticationFailed('El usuario está inactivo', code='user_inactive')
            
            # SimpleJWT / DRF requieren que is_authenticated sea True
            user.is_authenticated = True
            
            return user
            
        except CredencialModel.DoesNotExist:
            raise AuthenticationFailed('Usuario no encontrado', code='user_not_found')
        except Exception as e:
            raise AuthenticationFailed(str(e))
