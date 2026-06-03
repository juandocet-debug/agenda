"""
Migración de datos: crea la categoría 'Servicios' y asigna 
la empresa 'tester' a ella en producción (Railway).
"""
import uuid
from django.db import migrations


def seed_categoria_servicios(apps, schema_editor):
    CategoriaModel = apps.get_model('empresas_infra', 'CategoriaModel')
    EmpresaModel = apps.get_model('empresas_infra', 'EmpresaModel')

    cat, _ = CategoriaModel.objects.get_or_create(
        nombre='Servicios',
        defaults={
            'id': str(uuid.uuid4()),
            'icono': 'briefcase',
            'orden': 1,
            'activa': True,
        }
    )
    # Asignar todas las empresas cuyo nombre contenga 'tester' a la categoría
    EmpresaModel.objects.filter(nombre__icontains='tester').update(categoria=cat)


def reverse_seed(apps, schema_editor):
    pass  # No revertimos datos en producción


class Migration(migrations.Migration):

    dependencies = [
        ('empresas_infra', '0009_categoriamodel_empresa_categoria'),
    ]

    operations = [
        migrations.RunPython(seed_categoria_servicios, reverse_code=reverse_seed),
    ]
