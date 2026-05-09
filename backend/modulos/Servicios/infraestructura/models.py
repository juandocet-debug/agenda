from django.db import models

class ServicioModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    precio_valor = models.DecimalField(max_digits=10, decimal_places=2)
    duracion_minutos = models.IntegerField()
    activo = models.BooleanField(default=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'servicios_portafolio'
