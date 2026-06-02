from django.db import models


class PasswordResetTokenModel(models.Model):
    """Token de un solo uso para recuperación de contraseña."""
    token = models.CharField(max_length=100, unique=True, primary_key=True)
    email = models.EmailField(db_index=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    usado = models.BooleanField(default=False)

    class Meta:
        db_table = 'auth_password_reset_tokens'


class CredencialModel(models.Model):
    usuario_id = models.CharField(max_length=36, primary_key=True)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)
    rol = models.CharField(max_length=20, default='empresa')

    class Meta:
        db_table = 'auth_credenciales'
