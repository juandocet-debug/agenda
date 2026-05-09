from django.db import models

class CitaModel(models.Model):
    """
    Modelo ORM de Django para persistir las citas.
    Esta clase solo pertenece a la infraestructura y no interfiere con las reglas de negocio.
    """
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36)
    cliente_id = models.CharField(max_length=50)
    asesor_id = models.CharField(max_length=50)
    servicio_id = models.CharField(max_length=50)
    
    # Value Object Desglosado: Horario
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    
    estado = models.CharField(max_length=20, default='PENDIENTE')
    notas = models.TextField(blank=True, null=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'citas_agenda'
