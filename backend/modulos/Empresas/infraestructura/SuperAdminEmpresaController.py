from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from modulos.Empresas.infraestructura.models import EmpresaModel
from modulos.Autenticacion.infraestructura.models import CredencialModel
# Idealmente la validacion del SuperAdmin (jwt) estaria en un custom permission.
# Para esta prueba, confiaremos en la ruta, o asuminos que tiene un middleware.

from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request.user, 'rol', None) == 'superadmin'

class SuperAdminEmpresaController(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin] 
    
    def get(self, request):
        from django.db.models import Subquery, OuterRef, Count
        """Lista todas las empresas registradas para el panel del SuperAdmin (paginado)."""
        
        # A-3: Paginación — ?page=1&page_size=50 (default 50, max 100)
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 50))))
        except (ValueError, TypeError):
            page, page_size = 1, 50

        # Optimización: Evitar N+1 queries al consultar credenciales por cada empresa
        estado_activo_sq = CredencialModel.objects.filter(usuario_id=OuterRef('id')).values('activo')[:1]
        email_sq = CredencialModel.objects.filter(usuario_id=OuterRef('id')).values('email')[:1]
        username_sq = CredencialModel.objects.filter(usuario_id=OuterRef('id')).values('username')[:1]
        
        # A-2: annotate para evitar N+1 en noticias.count()
        empresas_qs = EmpresaModel.objects.annotate(
            credencial_activa=Subquery(estado_activo_sq),
            credencial_email=Subquery(email_sq),
            credencial_username=Subquery(username_sq),
            num_noticias=Count('noticias'),
        ).order_by('-id')

        total = empresas_qs.count()
        start = (page - 1) * page_size
        empresas_db = empresas_qs[start:start + page_size]
        
        resultado = []
        
        for empresa in empresas_db:
            estado_activo = getattr(empresa, 'credencial_activa', False) or False
            admin_email = getattr(empresa, 'credencial_email', 'Sin correo') or 'Sin correo'
            admin_nombre = getattr(empresa, 'credencial_username', 'Sin asignar') or 'Sin asignar'
                
            # A-7 FIX: Usar datos reales, no mock
            publicaciones = empresa.num_noticias

            resultado.append({
                'id': str(empresa.id),
                'nombre': empresa.nombre,
                'slug': empresa.slug,
                'logo_url': empresa.logo_url,
                'foto_portada_url': empresa.foto_portada_url,
                'fecha_suscripcion': empresa.fecha_creacion.strftime('%d %b, %Y') if empresa.fecha_creacion else 'N/A',
                'activa': estado_activo,
                'admin_email': admin_email,
                'admin_nombre': admin_nombre,
                'publicaciones': publicaciones,
                'ciudad': empresa.ciudad,
                'pais': empresa.pais,
                'direccion': empresa.direccion,
                'telefono': empresa.telefono,
            })
            
        return Response({
            'ok': True,
            'total': total,
            'page': page,
            'page_size': page_size,
            'datos': resultado,
        }, status=200)

class ActivarEmpresaController(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]
    
    def patch(self, request, empresa_id):
        """Activa o desactiva (Suspende) una empresa"""
        nuevo_estado = request.data.get('activa', False)
        
        try:
            credencial = CredencialModel.objects.get(usuario_id=empresa_id)
            credencial.activo = nuevo_estado
            credencial.save()
            return Response({'ok': True, 'mensaje': f"Empresa {'activada' if nuevo_estado else 'suspendida'} exitosamente."})
        except CredencialModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada'}, status=404)

class EliminarEmpresaController(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]
    
    def delete(self, request, empresa_id):
        """Elimina permanentemente una empresa y sus credenciales"""
        from modulos.Empresas.aplicacion.EliminarEmpresa.EliminarEmpresaUseCase import EliminarEmpresaUseCase
        from modulos.Empresas.infraestructura.DjangoEmpresaRepository import DjangoEmpresaRepository
        from modulos.Autenticacion.infraestructura.DjangoAutenticacionRepository import DjangoAutenticacionRepository
        
        repo_empresa = DjangoEmpresaRepository()
        repo_auth = DjangoAutenticacionRepository()
        use_case = EliminarEmpresaUseCase(repo_empresa, repo_auth)
        
        try:
            use_case.run(empresa_id)
            return Response({'ok': True, 'mensaje': 'Empresa eliminada exitosamente.'}, status=200)
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=404)
        except Exception as e:
            return Response({'ok': False, 'error': 'Error interno al eliminar la empresa.'}, status=500)

class ActualizarImagenesEmpresaController(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]
    
    def patch(self, request, empresa_id):
        """Actualiza el logo o la foto de portada de una empresa"""
        logo_base64 = request.data.get('logo_base64')
        portada_base64 = request.data.get('portada_base64')
        
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            if logo_base64:
                empresa.logo_url = logo_base64
            if portada_base64:
                empresa.foto_portada_url = portada_base64
                
            empresa.save()
            return Response({'ok': True, 'mensaje': 'Imágenes actualizadas correctamente.'}, status=200)
        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada'}, status=404)
        except Exception as e:
            import logging; logging.getLogger(__name__).exception('[ActualizarImagenesEmpresa] Error interno')
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)


class ActualizarDatosEmpresaController(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def patch(self, request, empresa_id):
        """Actualiza los datos de contacto/ubicación de una empresa."""
        campos_permitidos = ['nombre', 'ciudad', 'pais', 'direccion', 'telefono', 'correo_contacto', 'moneda', 'mensaje_advertencia']
        
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            
            actualizado = False
            for campo in campos_permitidos:
                if campo in request.data:
                    setattr(empresa, campo, request.data[campo])
                    actualizado = True

            if actualizado:
                empresa.save()
                return Response({'ok': True, 'mensaje': 'Datos actualizados correctamente.'}, status=200)
            else:
                return Response({'ok': False, 'error': 'No se enviaron campos para actualizar.'}, status=400)

        except EmpresaModel.DoesNotExist:
            return Response({'ok': False, 'error': 'Empresa no encontrada.'}, status=404)
        except Exception as e:
            return Response({'ok': False, 'error': 'Error interno al actualizar datos.'}, status=500)
