from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .DjangoReportesAdapter import DjangoReportesAdapter
from modulos.Reportes.aplicacion.GenerarResumenFinanciero.GenerarResumenFinanciero import GenerarResumenFinanciero

class ReportesController(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa_id = request.query_params.get('empresa_id')
        if not empresa_id:
            return Response({'ok': False, 'error': 'empresa_id es requerido'}, status=400)

        # Solo la empresa dueña o superadmin puede ver sus reportes
        rol = getattr(request.user, 'rol', '')
        if rol != 'superadmin' and str(request.user.usuario_id) != str(empresa_id):
            return Response({'ok': False, 'error': 'Sin permisos para ver estos reportes.'}, status=403)

        adapter = DjangoReportesAdapter()
        caso_uso = GenerarResumenFinanciero(query_port=adapter)

        try:
            datos = caso_uso.run(empresa_id)
            return Response({'ok': True, 'datos': datos}, status=200)
        except Exception as e:
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)
