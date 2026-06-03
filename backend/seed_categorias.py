import os, django, uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from modulos.Empresas.infraestructura.models import CategoriaModel, EmpresaModel

# 1. Crear categoria Servicios
cat, created = CategoriaModel.objects.get_or_create(
    nombre='Servicios',
    defaults={'id': str(uuid.uuid4()), 'icono': 'briefcase', 'orden': 1, 'activa': True}
)
status = 'creada' if created else 'ya existia'
print(f"Categoria Servicios: {status} (id={cat.id})")

# 2. Asignar tester a Servicios
updated = EmpresaModel.objects.filter(nombre__icontains='tester').update(categoria=cat)
print(f"Empresas tester actualizadas: {updated}")

# 3. Listar empresas que NO son tester antes de borrar
no_tester = EmpresaModel.objects.exclude(nombre__icontains='tester')
print(f"Empresas a eliminar: {list(no_tester.values_list('nombre', flat=True))}")
deleted = no_tester.delete()
print(f"Eliminadas: {deleted}")

# 4. Verificar final
remaining = list(EmpresaModel.objects.values_list('nombre', 'categoria__nombre'))
print(f"Empresas restantes: {remaining}")
