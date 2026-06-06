from django.db import migrations
import encrypted_model_fields.fields


def limpiar_llaves_wompi(apps, schema_editor):
    """
    Los valores existentes son texto plano y no pueden descifrarse con Fernet.
    Se anulan para que las empresas los re-ingresen desde el panel de configuración.
    """
    EmpresaModel = apps.get_model('empresas_infra', 'EmpresaModel')
    EmpresaModel.objects.exclude(wompi_public_key__isnull=True).update(
        wompi_public_key=None,
        wompi_integrity_key=None,
        wompi_events_secret=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('empresas_infra', '0011_empresamodel_nit_empresamodel_rut_archivo_and_more'),
    ]

    operations = [
        # 1. Primero limpiar valores en texto plano (incompatibles con Fernet)
        migrations.RunPython(limpiar_llaves_wompi, migrations.RunPython.noop),

        # 2. Cambiar tipo de columna a EncryptedCharField
        migrations.AlterField(
            model_name='empresamodel',
            name='wompi_public_key',
            field=encrypted_model_fields.fields.EncryptedCharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='empresamodel',
            name='wompi_integrity_key',
            field=encrypted_model_fields.fields.EncryptedCharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='empresamodel',
            name='wompi_events_secret',
            field=encrypted_model_fields.fields.EncryptedCharField(blank=True, max_length=100, null=True),
        ),
    ]
