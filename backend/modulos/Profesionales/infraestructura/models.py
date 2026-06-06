from django.db import models

class ProfesionalModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36, db_index=True)
    nombre = models.CharField(max_length=150)
    especialidad = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    foto_url = models.TextField(blank=True, null=True) # Almacenará la cadena Base64
    activo = models.BooleanField(default=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresas_profesionales'
