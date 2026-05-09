from typing import Dict, Any
from django.db.models import Sum, F
from modulos.Reportes.aplicacion.Puertos import ReportesQueryPort
from modulos.Pagos.infraestructura.models import PagoModel

class DjangoReportesAdapter(ReportesQueryPort):
    def obtener_resumen_financiero(self, empresa_id: str) -> Dict[str, Any]:
        qs = PagoModel.objects.filter(empresa_id=empresa_id)
        
        # Uso de agregación de Django para un rendimiento óptimo
        agregado = qs.aggregate(
            total_ventas=Sum('monto_total'),
            total_cobrado=Sum('monto_pagado')
        )
        
        ventas = agregado['total_ventas'] or 0.0
        cobrado = agregado['total_cobrado'] or 0.0
        pendiente = float(ventas) - float(cobrado)
        
        return {
            'total_ventas': str(ventas),
            'total_cobrado': str(cobrado),
            'total_pendiente': str(pendiente),
            'total_citas': qs.count()
        }
