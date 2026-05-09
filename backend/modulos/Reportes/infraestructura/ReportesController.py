from rest_framework.views import APIView
from rest_framework.response import Response
from .DjangoReportesAdapter import DjangoReportesAdapter
from modulos.Reportes.aplicacion.GenerarResumenFinanciero.GenerarResumenFinanciero import GenerarResumenFinanciero

class ReportesController(APIView):
    def get(self, request):
        empresa_id = request.query_params.get('empresa_id')
        if not empresa_id:
            return Response({'ok': False, 'error': 'empresa_id es requerido'}, status=400)
            
        adapter = DjangoReportesAdapter()
        caso_uso = GenerarResumenFinanciero(query_port=adapter)
        
        try:
            datos = caso_uso.run(empresa_id)
            return Response({'ok': True, 'datos': datos}, status=200)
        except Exception as e:
            return Response({'ok': False, 'error': f"Error interno: {str(e)}"}, status=500)
