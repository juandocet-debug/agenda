from django.urls import path
from .EmpresaController import (
    EmpresaVisualConfigController,
    PerfilPublicoEmpresaController,
    DetalleEmpresaPrivadoController,
    ConfigurarWompiController,
    ListaEmpresasPublicasController,
)
from .SuperAdminEmpresaController import (
    SuperAdminEmpresaController,
    ActivarEmpresaController,
    EliminarEmpresaController,
    ActualizarImagenesEmpresaController,
    ActualizarDatosEmpresaController,
)
from .BannersController import BannersPublicosController, BannersAdminController

urlpatterns = [
    # Catálogo público — clientes exploran empresas activas (sin auth)
    path('publicas/', ListaEmpresasPublicasController.as_view(), name='lista_empresas_publicas'),
    path('publicas/banners/', BannersPublicosController.as_view(), name='lista_banners_publicos'),

    # Panel SuperAdmin
    path('admin/banners/', BannersAdminController.as_view(), name='admin_banners'),
    path('admin/banners/<str:banner_id>/', BannersAdminController.as_view(), name='admin_banners_id'),
    path('admin/lista/', SuperAdminEmpresaController.as_view(), name='admin_lista_empresas'),
    path('admin/<str:empresa_id>/activar/', ActivarEmpresaController.as_view(), name='admin_activar_empresa'),
    path('admin/<str:empresa_id>/eliminar/', EliminarEmpresaController.as_view(), name='admin_eliminar_empresa'),
    path('admin/<str:empresa_id>/imagenes/', ActualizarImagenesEmpresaController.as_view(), name='admin_actualizar_imagenes'),
    path('admin/<str:empresa_id>/datos/', ActualizarDatosEmpresaController.as_view(), name='admin_actualizar_datos'),

    # Empresa config por slug
    path('<str:slug>/config/', EmpresaVisualConfigController.as_view(), name='empresa_config'),
    path('<str:empresa_id>/publico/', PerfilPublicoEmpresaController.as_view(), name='empresa_publico'),

    # Perfil privado
    path('privado/<str:empresa_id>/', DetalleEmpresaPrivadoController.as_view(), name='empresa_privada'),
    path('privado/<str:empresa_id>/wompi/', ConfigurarWompiController.as_view(), name='configurar_wompi'),
]
