path = 'backend/modulos/Empresas/infraestructura/EmpresaController.py'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

new_class = (
    "\n\n"
    "class ListaEmpresasPublicasController(APIView):\n"
    "    permission_classes = [AllowAny]\n"
    "\n"
    "    def get(self, request):\n"
    "        from modulos.Autenticacion.infraestructura.models import CredencialModel\n"
    "        ids_activos = set(\n"
    "            CredencialModel.objects.filter(activo=True).values_list('usuario_id', flat=True)\n"
    "        )\n"
    "        empresas_db = EmpresaModel.objects.filter(id__in=ids_activos).order_by('nombre')\n"
    "        resultado = [\n"
    "            {\n"
    "                'id':        str(e.id),\n"
    "                'nombre':    e.nombre,\n"
    "                'logo_url':  e.logo_url or '',\n"
    "                'foto_portada_url': e.foto_portada_url or '',\n"
    "                'ciudad':    e.ciudad or '',\n"
    "                'direccion': e.direccion or '',\n"
    "                'telefono':  e.telefono or '',\n"
    "            }\n"
    "            for e in empresas_db\n"
    "        ]\n"
    "        return Response({'ok': True, 'datos': resultado}, status=200)\n"
)

marker = 'from .models import EmpresaModel, NoticiaModel'
if marker in c:
    c2 = c.replace(marker, marker + new_class, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c2)
    print('OK')
else:
    print('MARKER NOT FOUND')
