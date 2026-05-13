from django.db import models

class CitaModel(models.Model):
    ESTADOS = [
        ('PROGRAMADA', 'Programada (pendiente de pago)'),
        ('CONFIRMADA', 'Confirmada'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    ]

    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36)
    profesional_id = models.CharField(max_length=50, blank=True, null=True)
    servicio_id = models.CharField(max_length=50)

    # Cliente puede ser registrado o invitado (guest)
    cliente_id = models.CharField(max_length=50, blank=True, null=True)
    cliente_nombre = models.CharField(max_length=150, blank=True, null=True)
    cliente_telefono = models.CharField(max_length=30, blank=True, null=True)
    cliente_email = models.EmailField(blank=True, null=True)

    # Horario
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    estado = models.CharField(max_length=20, choices=ESTADOS, default='PROGRAMADA')
    notas = models.TextField(blank=True, null=True)
    wompi_referencia = models.CharField(max_length=100, blank=True, null=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'citas_agenda'


class HorarioEmpresaModel(models.Model):
    DIAS = [(i, d) for i, d in enumerate(
        ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    )]

    id = models.AutoField(primary_key=True)
    empresa_id = models.CharField(max_length=36)
    dia_semana = models.IntegerField(choices=DIAS)  # 0=Lunes ... 6=Domingo
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'citas_horarios_empresa'
        unique_together = ('empresa_id', 'dia_semana')
