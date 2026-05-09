from django.db import models

class UsuarioModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36)
    nombre = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=50)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'usuarios_sistema'
