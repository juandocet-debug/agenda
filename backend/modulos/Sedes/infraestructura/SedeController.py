"""
SedeController.py — Endpoints del módulo Sedes (hexagonal).

Endpoints públicos:
  GET  /api/sedes/publicas/?empresa_id=<id>   → lista sedes activas (sin auth)

Endpoints privados (requieren JWT empresa):
  GET  /api/sedes/                             → lista todas las sedes propias
  POST /api/sedes/                             → crear sede
  PUT  /api/sedes/<sede_id>/                  → editar sede
  DELETE /api/sedes/<sede_id>/               → desactivar sede
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .DjangoSedeRepository import DjangoSedeRepository
from ..aplicacion.SedeUseCases import (
    CrearSedeUseCase, ListarSedesUseCase,
    EditarSedeUseCase, EliminarSedeUseCase,
)


def _repo():
    return DjangoSedeRepository()


def _sede_to_dict(sede) -> dict:
    return {
        'id': sede.id,
        'empresa_id': sede.empresa_id,
        'nombre': sede.nombre,
        'direccion': sede.direccion,
        'ciudad': sede.ciudad,
        'telefono': sede.telefono,
        'activa': sede.activa,
    }


# ─── Público ─────────────────────────────────────────────────────────────────

class SedesPublicasController(APIView):
    """GET /api/sedes/publicas/?empresa_id=<id>  → devuelve sedes activas."""
    permission_classes = [AllowAny]

    def get(self, request):
        empresa_id = request.query_params.get('empresa_id')
        if not empresa_id:
            return Response({'ok': False, 'error': 'empresa_id es requerido.'}, status=400)
        sedes = ListarSedesUseCase(_repo()).ejecutar(empresa_id, solo_activas=True)
        return Response({'ok': True, 'datos': [_sede_to_dict(s) for s in sedes]})


# ─── Privado (empresa autenticada) ────────────────────────────────────────────

class SedesController(APIView):
    """GET / POST sobre /api/sedes/"""
    permission_classes = [IsAuthenticated]

    def _empresa_id(self, request) -> str:
        return str(request.user.usuario_id)

    def get(self, request):
        empresa_id = self._empresa_id(request)
        sedes = ListarSedesUseCase(_repo()).ejecutar(empresa_id, solo_activas=False)
        return Response({'ok': True, 'datos': [_sede_to_dict(s) for s in sedes]})

    def post(self, request):
        empresa_id = self._empresa_id(request)
        d = request.data
        try:
            sede = CrearSedeUseCase(_repo()).ejecutar(
                empresa_id=empresa_id,
                nombre=d.get('nombre', ''),
                direccion=d.get('direccion'),
                ciudad=d.get('ciudad'),
                telefono=d.get('telefono'),
            )
            return Response({'ok': True, 'datos': _sede_to_dict(sede)}, status=201)
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=400)


class SedeDetalleController(APIView):
    """PUT / DELETE sobre /api/sedes/<sede_id>/"""
    permission_classes = [IsAuthenticated]

    def _empresa_id(self, request) -> str:
        return str(request.user.usuario_id)

    def put(self, request, sede_id):
        empresa_id = self._empresa_id(request)
        d = request.data
        try:
            sede = EditarSedeUseCase(_repo()).ejecutar(
                sede_id=sede_id,
                empresa_id=empresa_id,
                nombre=d.get('nombre'),
                direccion=d.get('direccion'),
                ciudad=d.get('ciudad'),
                telefono=d.get('telefono'),
                activa=d.get('activa'),
            )
            return Response({'ok': True, 'datos': _sede_to_dict(sede)})
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=404)
        except PermissionError as e:
            return Response({'ok': False, 'error': str(e)}, status=403)

    def delete(self, request, sede_id):
        empresa_id = self._empresa_id(request)
        try:
            ok = EliminarSedeUseCase(_repo()).ejecutar(sede_id, empresa_id)
            if ok:
                return Response({'ok': True, 'mensaje': 'Sede desactivada.'})
            return Response({'ok': False, 'error': 'No se pudo desactivar.'}, status=400)
        except ValueError as e:
            return Response({'ok': False, 'error': str(e)}, status=404)
        except PermissionError as e:
            return Response({'ok': False, 'error': str(e)}, status=403)
