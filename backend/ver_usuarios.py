import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from modulos.Empresas.infraestructura.models import EmpresaModel
from modulos.Autenticacion.infraestructura.models import CredencialModel

print('=== TODOS LOS USUARIOS EN PRODUCCION ===')
for u in CredencialModel.objects.all():
    print(f'  [{u.rol}] email={u.email} | username={u.username} | activo={u.activo} | id={u.usuario_id}')

print()
print('=== EMPRESAS ===')
for e in EmpresaModel.objects.all():
    cred = CredencialModel.objects.filter(usuario_id=str(e.usuario_id)).first()
    email_cred = cred.email if cred else 'SIN CREDENCIAL'
    print(f'  Empresa: {e.nombre} | empresa_id={e.id} | usuario_id={e.usuario_id} | login_email={email_cred}')
