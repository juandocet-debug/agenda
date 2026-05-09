from django.urls import path
from .EmpresaController import EmpresaVisualConfigController
from .SuperAdminEmpresaController import SuperAdminEmpresaController, ActivarEmpresaController, EliminarEmpresaController

urlpatterns = [
    # Panel SuperAdmin
    path('admin/lista/', SuperAdminEmpresaController.as_view(), name='admin_lista_empresas'),
    path('admin/<str:empresa_id>/activar/', ActivarEmpresaController.as_view(), name='admin_activar_empresa'),
    path('admin/<str:empresa_id>/eliminar/', EliminarEmpresaController.as_view(), name='admin_eliminar_empresa'),
    
    # Ejemplo de uso: /api/empresas/barberia-carlos/config/
    path('<str:slug>/config/', EmpresaVisualConfigController.as_view(), name='empresa_config'),
]
