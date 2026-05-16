from django.db import models


class SedeModel(models.Model):
    """
    Representación de una sede/sucursal de una empresa en la BD.
    Una empresa puede tener múltiples sedes. Los horarios de cada sede
    se configuran en HorarioEmpresaModel filtrando por sede_id.
    """
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36, db_index=True)
    nombre = models.CharField(max_length=200)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresa_sedes'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.empresa_id})"
