from modulos.Empresas.dominio.EmpresaRepositoryPort import EmpresaRepositoryPort
from .models import EmpresaModel

class DjangoEmpresaRepository(EmpresaRepositoryPort):
    def eliminar(self, id: str) -> bool:
        try:
            empresa = EmpresaModel.objects.get(id=id)
            empresa.delete()
            return True
        except EmpresaModel.DoesNotExist:
            return False

    def obtener_empresas_publicas_paginadas(self, request) -> dict:
        from rest_framework.pagination import LimitOffsetPagination
        from django.db.models import Subquery
        from modulos.Autenticacion.infraestructura.models import CredencialModel
        
        paginator = LimitOffsetPagination()
        
        # Optimización: Usar Subquery para evitar el N+1 y cargar miles de IDs a la RAM
        subquery = CredencialModel.objects.filter(activo=True).values('usuario_id')
        empresas_db = EmpresaModel.objects.filter(id__in=Subquery(subquery)).order_by('nombre')
        
        # Paginar la consulta en SQL (añade LIMIT y OFFSET automáticamente)
        paginated_queryset = paginator.paginate_queryset(empresas_db, request)
        
        resultado = [
            {
                'id':        str(e.id),
                'nombre':    e.nombre,
                'logo_url':  e.logo_url or '',
                'foto_portada_url': getattr(e, 'foto_portada_url', ''),
                'ciudad':    getattr(e, 'ciudad', ''),
                'direccion': getattr(e, 'direccion', ''),
                'telefono':  getattr(e, 'telefono', ''),
            }
            for e in paginated_queryset
        ]
        
        return {
            'count': paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
            'results': resultado
        }
