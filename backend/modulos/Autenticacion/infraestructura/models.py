from django.db import models

class CredencialModel(models.Model):
    usuario_id = models.CharField(max_length=36, primary_key=True)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)
    rol = models.CharField(max_length=20, default='empresa')

    class Meta:
        db_table = 'auth_credenciales'
