"""
Controladores para el CRUD de Categorías desde el panel SuperAdmin.
Seguridad: Todos los endpoints validan que el token JWT pertenezca
a un usuario con rol 'superadmin'.
"""
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import CategoriaModel, EmpresaModel


class IsSuperAdmin(IsAuthenticated):
    """
    Permiso personalizado: el usuario debe estar autenticado
    y tener rol 'superadmin' en el payload del JWT.
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request.user, 'rol', None) == 'superadmin'


class CategoriasAdminController(APIView):
    """
    GET  /api/empresas/admin/categorias/          → lista todas
    POST /api/empresas/admin/categorias/          → crea nueva
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        cats = CategoriaModel.objects.all()
        data = [
            {
                'id': c.id,
                'nombre': c.nombre,
                'icono': c.icono,
                'orden': c.orden,
                'activa': c.activa,
                'total_empresas': c.empresas.count(),
            }
            for c in cats
        ]
        return Response({'ok': True, 'datos': data}, status=200)

    def post(self, request):
        nombre = (request.data.get('nombre') or '').strip()
        if not nombre:
            return Response({'ok': False, 'error': 'El nombre es obligatorio.'}, status=400)
        if CategoriaModel.objects.filter(nombre__iexact=nombre).exists():
            return Response({'ok': False, 'error': 'Ya existe una categoría con ese nombre.'}, status=409)

        cat = CategoriaModel.objects.create(
            id=str(uuid.uuid4()),
            nombre=nombre,
            icono=request.data.get('icono', ''),
            orden=int(request.data.get('orden', 0)),
            activa=bool(request.data.get('activa', True)),
        )
        return Response({
            'ok': True,
            'mensaje': 'Categoría creada exitosamente.',
            'datos': {'id': cat.id, 'nombre': cat.nombre, 'icono': cat.icono, 'orden': cat.orden}
        }, status=201)


class CategoriaDetalleAdminController(APIView):
    """
    PATCH  /api/empresas/admin/categorias/<cat_id>/  → editar
    DELETE /api/empresas/admin/categorias/<cat_id>/  → eliminar
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def _get_or_404(self, cat_id):
        try:
            return CategoriaModel.objects.get(id=cat_id)
        except CategoriaModel.DoesNotExist:
            return None

    def patch(self, request, cat_id):
        cat = self._get_or_404(cat_id)
        if not cat:
            return Response({'ok': False, 'error': 'Categoría no encontrada.'}, status=404)

        campos = ['nombre', 'icono', 'orden', 'activa']
        for campo in campos:
            if campo in request.data:
                setattr(cat, campo, request.data[campo])
        cat.save()
        return Response({'ok': True, 'mensaje': 'Categoría actualizada.'}, status=200)

    def delete(self, request, cat_id):
        cat = self._get_or_404(cat_id)
        if not cat:
            return Response({'ok': False, 'error': 'Categoría no encontrada.'}, status=404)

        # Desasociar empresas antes de borrar (SET_NULL lo hace el ORM, pero lo confirmamos)
        EmpresaModel.objects.filter(categoria=cat).update(categoria=None)
        cat.delete()
        return Response({'ok': True, 'mensaje': 'Categoría eliminada exitosamente.'}, status=200)


class AsignarCategoriaEmpresaController(APIView):
    """
    PATCH /api/empresas/admin/<empresa_id>/categoria/
    Body: { "categoria_id": "<uuid>" | null }
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def patch(self, request, empresa_id):
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada.'}, status=404)

        cat_id = request.data.get('categoria_id')
        if cat_id:
            try:
                categoria = CategoriaModel.objects.get(id=cat_id)
                empresa.categoria = categoria
            except CategoriaModel.DoesNotExist:
                return Response({'ok': False, 'error': 'Categoría no encontrada.'}, status=404)
        else:
            empresa.categoria = None

        empresa.save(update_fields=['categoria'])
        return Response({'ok': True, 'mensaje': 'Categoría asignada correctamente.'}, status=200)


class CategoriasPublicasController(APIView):
    """
    GET /api/empresas/publicas/categorias/
    Devuelve las categorías activas con sus empresas activas anidadas.
    Sin autenticación requerida.
    """
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Subquery, Prefetch
        from modulos.Autenticacion.infraestructura.models import CredencialModel
        from modulos.Empresas.infraestructura.models import EmpresaModel

        # Optimización: Filtrar con Subquery en DB en lugar de traer todo a la RAM de Python
        subquery = CredencialModel.objects.filter(activo=True).values('usuario_id')
        
        # Pre-cargar las empresas activas asociadas a la categoría
        empresas_prefetch = Prefetch(
            'empresas',
            queryset=EmpresaModel.objects.filter(id__in=Subquery(subquery)).order_by('nombre')
        )

        cats = CategoriaModel.objects.filter(activa=True).prefetch_related(empresas_prefetch)
        
        resultado = []
        for c in cats:
            empresas_activas = c.empresas.all()  # Ya está filtrado por el Prefetch
            if not empresas_activas:
                continue
                
            lista_empresas = [
                {
                    'id': str(e.id),
                    'nombre': e.nombre,
                    'logo_url': e.logo_url or '',
                    'foto_portada_url': e.foto_portada_url or '',
                    'ciudad': e.ciudad or '',
                    'direccion': e.direccion or '',
                    'telefono': e.telefono or '',
                }
                for e in empresas_activas
            ]
            
            resultado.append({
                'id': c.id,
                'nombre': c.nombre,
                'icono': c.icono,
                'empresas': lista_empresas,
            })

        return Response({'ok': True, 'datos': resultado}, status=200)
