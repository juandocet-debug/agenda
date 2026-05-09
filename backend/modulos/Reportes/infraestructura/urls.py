from django.urls import path
from .ReportesController import ReportesController

urlpatterns = [
    # Ej: /api/reportes/financiero/?empresa_id=123
    path('financiero/', ReportesController.as_view(), name='reportes_financieros'),
]
