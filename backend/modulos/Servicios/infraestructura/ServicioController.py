import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

logger = logging.getLogger(__name__)
from modulos.Empresas.infraestructura.models import EmpresaModel
from .DjangoServicioRepository import DjangoServicioRepository
from modulos.Servicios.aplicacion.CrearServicio.CrearServicio import CrearServicio
from modulos.Servicios.aplicacion.ActualizarServicio.ActualizarServicio import ActualizarServicio
from modulos.Servicios.aplicacion.EliminarServicio.EliminarServicio import EliminarServicio

class ServicioController(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def post(self, request):
        data = request.data
        try:
            empresa_id = data.get('empresa_id')
            nombre = data.get('nombre')
            precio = data.get('precio')
            tipo_servicio = data.get('tipo_servicio', 'CITA')
            duracion = data.get('duracion')
            descripcion = data.get('descripcion')
            imagen_url = data.get('imagen_url')
            permite_sesion = data.get('permite_sesion', True)
            precio_30_dias = data.get('precio_30_dias')
            precio_90_dias = data.get('precio_90_dias')
            precio_120_dias = data.get('precio_120_dias')
            
            if not all([empresa_id, nombre, precio is not None]):
                return Response({'ok': False, 'error': 'Faltan datos requeridos (empresa_id, nombre, precio)'}, status=400)
            
            if tipo_servicio == 'CITA' and not duracion:
                return Response({'ok': False, 'error': 'Las citas requieren duración'}, status=400)
                
            repo = DjangoServicioRepository()
            caso_uso = CrearServicio(servicio_repository=repo)
            
            servicio = caso_uso.run(
                empresa_id=empresa_id,
                nombre=nombre,
                precio_valor=float(precio),
                tipo_servicio=tipo_servicio,
                duracion_minutos=int(duracion) if duracion else None,
                descripcion=descripcion,
                imagen_url=imagen_url,
                permite_sesion=bool(permite_sesion),
                precio_30_dias=float(precio_30_dias) if precio_30_dias else None,
                precio_90_dias=float(precio_90_dias) if precio_90_dias else None,
                precio_120_dias=float(precio_120_dias) if precio_120_dias else None,
            )
            
            return Response({'ok': True, 'datos': {'servicio_id': servicio.id}}, status=201)
            
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            logger.exception("[ServicioController.post] Error interno")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)

    def get(self, request):
        """Devuelve el portafolio de una empresa"""
        empresa_id = request.query_params.get('empresa_id')
        if not empresa_id:
            return Response({'ok': False, 'error': 'empresa_id es requerido'}, status=400)
            
        repo = DjangoServicioRepository()
        servicios = repo.listar_por_empresa(empresa_id)
        
        empresa_moneda = 'COP'
        try:
            empresa = EmpresaModel.objects.get(id=empresa_id)
            empresa_moneda = empresa.moneda
        except EmpresaModel.DoesNotExist:
            pass
        
        datos = [{
            'id': s.id,
            'nombre': s.nombre,
            'descripcion': s.descripcion,
            'tipo_servicio': getattr(s, 'tipo_servicio', 'CITA'),
            'precio': str(s.precio.valor),
            'duracion_minutos': s.duracion.valor if s.duracion else None,
            'imagen_url': getattr(s, 'imagen_url', None),
            # Campos de paquetes
            'permite_sesion': getattr(s, 'permite_sesion', True),
            'precio_30_dias': str(s.precio_30_dias) if s.precio_30_dias else None,
            'precio_90_dias': str(s.precio_90_dias) if s.precio_90_dias else None,
            'precio_120_dias': str(s.precio_120_dias) if s.precio_120_dias else None,
        } for s in servicios]
        
        return Response({'ok': True, 'moneda': empresa_moneda, 'datos': datos}, status=200)

class ActualizarServicioController(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, servicio_id):
        data = request.data
        try:
            empresa_id = str(request.user.usuario_id)
            nombre = data.get('nombre')
            precio = data.get('precio')
            tipo_servicio = data.get('tipo_servicio', 'CITA')
            duracion = data.get('duracion')
            descripcion = data.get('descripcion')
            imagen_url = data.get('imagen_url')
            activo = data.get('activo', True)
            permite_sesion = data.get('permite_sesion', True)
            precio_30_dias = data.get('precio_30_dias')
            precio_90_dias = data.get('precio_90_dias')
            precio_120_dias = data.get('precio_120_dias')

            repo = DjangoServicioRepository()
            caso_uso = ActualizarServicio(servicio_repository=repo)
            
            servicio = caso_uso.run(
                servicio_id=servicio_id,
                empresa_id=empresa_id,
                nombre=nombre,
                precio_valor=float(precio),
                tipo_servicio=tipo_servicio,
                duracion_minutos=int(duracion) if duracion else None,
                descripcion=descripcion,
                imagen_url=imagen_url,
                activo=activo,
                permite_sesion=bool(permite_sesion),
                precio_30_dias=float(precio_30_dias) if precio_30_dias else None,
                precio_90_dias=float(precio_90_dias) if precio_90_dias else None,
                precio_120_dias=float(precio_120_dias) if precio_120_dias else None,
            )
            return Response({'ok': True, 'mensaje': 'Servicio actualizado correctamente'}, status=200)
        except Exception as e:
            logger.exception("[ActualizarServicioController] Error interno")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)

    def delete(self, request, servicio_id):
        try:
            empresa_id = str(request.user.usuario_id)
            repo = DjangoServicioRepository()
            caso_uso = EliminarServicio(servicio_repository=repo)
            caso_uso.run(servicio_id=servicio_id, empresa_id=empresa_id)
            return Response({'ok': True, 'mensaje': 'Servicio desactivado correctamente'}, status=200)
        except Exception as e:
            logger.exception("[EliminarServicioController] Error interno")
            return Response({'ok': False, 'error': 'Error interno del servidor.'}, status=500)
