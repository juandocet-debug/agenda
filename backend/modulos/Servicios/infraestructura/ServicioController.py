from rest_framework.views import APIView
from rest_framework.response import Response
from .DjangoServicioRepository import DjangoServicioRepository
from modulos.Servicios.aplicacion.CrearServicio.CrearServicio import CrearServicio

class ServicioController(APIView):
    def post(self, request):
        data = request.data
        try:
            empresa_id = data.get('empresa_id')
            nombre = data.get('nombre')
            precio = data.get('precio')
            duracion = data.get('duracion')
            descripcion = data.get('descripcion')
            
            if not all([empresa_id, nombre, precio is not None, duracion]):
                return Response({'ok': False, 'error': 'Faltan datos requeridos (empresa_id, nombre, precio, duracion)'}, status=400)
                
            repo = DjangoServicioRepository()
            caso_uso = CrearServicio(servicio_repository=repo)
            
            servicio = caso_uso.run(
                empresa_id=empresa_id,
                nombre=nombre,
                precio_valor=float(precio),
                duracion_minutos=int(duracion),
                descripcion=descripcion
            )
            
            return Response({'ok': True, 'datos': {'servicio_id': servicio.id}}, status=201)
            
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)
        except Exception as e:
            return Response({'ok': False, 'error': f"Error interno: {str(e)}"}, status=500)

    def get(self, request):
        """Devuelve el portafolio de una empresa"""
        empresa_id = request.query_params.get('empresa_id')
        if not empresa_id:
            return Response({'ok': False, 'error': 'empresa_id es requerido'}, status=400)
            
        repo = DjangoServicioRepository()
        servicios = repo.listar_por_empresa(empresa_id)
        
        datos = [{
            'id': s.id,
            'nombre': s.nombre,
            'descripcion': s.descripcion,
            'precio': str(s.precio.valor),
            'duracion': s.duracion.valor
        } for s in servicios]
        
        return Response({'ok': True, 'datos': datos}, status=200)
