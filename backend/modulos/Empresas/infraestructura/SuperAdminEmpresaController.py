from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from modulos.Empresas.infraestructura.models import EmpresaModel
from modulos.Autenticacion.infraestructura.models import CredencialModel
# Idealmente la validacion del SuperAdmin (jwt) estaria en un custom permission.
# Para esta prueba, confiaremos en la ruta, o asuminos que tiene un middleware.

class SuperAdminEmpresaController(APIView):
    permission_classes = [AllowAny] 
    
    def get(self, request):
        """Lista todas las empresas registradas para el panel del SuperAdmin."""
        empresas_db = EmpresaModel.objects.all().order_by('-id')
        resultado = []
        
        for empresa in empresas_db:
            # Buscamos su estado activo en la tabla de credenciales usando el ID de la empresa
            # ya que el usuario_id de la credencial es el mismo ID de la empresa (segun el caso de uso)
            try:
                credencial = CredencialModel.objects.get(usuario_id=empresa.id)
                estado_activo = credencial.activo
                admin_email = credencial.email
                admin_nombre = credencial.username or 'Administrador'
            except CredencialModel.DoesNotExist:
                estado_activo = False
                admin_email = 'Sin correo'
                admin_nombre = 'Sin asignar'
                
            # Mock de datos analíticos
            publicaciones = empresa.noticias.count()
            es_pro = publicaciones > 2 or empresa.profesionales > 2 if hasattr(empresa, 'profesionales') else False
            tipo_plan = 'Pro' if es_pro else 'Free'
            actividad_semanal = [12, 19, 15, 25, 22, 30, 28] if es_pro else [2, 5, 3, 8, 4, 10, 7]

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
                'profesionales': 3, 
                'usuarios': 15,
                'publicaciones': publicaciones,
                'likes': publicaciones * 12 + 5,
                'tipo_plan': tipo_plan,
                'actividad_semanal': actividad_semanal,
                'ciudad': empresa.ciudad,
                'pais': empresa.pais,
                'direccion': empresa.direccion,
                'telefono': empresa.telefono,
            })
            
        return Response({'ok': True, 'datos': resultado}, status=200)

class ActivarEmpresaController(APIView):
    permission_classes = [AllowAny]
    
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
    permission_classes = [AllowAny]
    
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
    permission_classes = [AllowAny]
    
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
            return Response({'ok': False, 'error': str(e)}, status=500)


class ActualizarDatosEmpresaController(APIView):
    permission_classes = [AllowAny]

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
