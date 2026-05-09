from typing import Dict, Any
from modulos.Reportes.aplicacion.Puertos import ReportesQueryPort

class GenerarResumenFinanciero:
    def __init__(self, query_port: ReportesQueryPort):
        self.query_port = query_port

    def run(self, empresa_id: str) -> Dict[str, Any]:
        """Orquesta la consulta de los totales de ventas de la empresa."""
        if not empresa_id:
            raise ValueError("empresa_id es requerido.")
            
        resumen = self.query_port.obtener_resumen_financiero(empresa_id)
        return resumen
