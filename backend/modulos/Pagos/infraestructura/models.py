from django.db import models

class PagoModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36)
    cita_id = models.CharField(max_length=36, unique=True)
    monto_total = models.DecimalField(max_digits=10, decimal_places=2)
    monto_pagado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    estado = models.CharField(max_length=20, default='PENDIENTE')
    metodo_pago_ultimo = models.CharField(max_length=50, blank=True, null=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagos_citas'
