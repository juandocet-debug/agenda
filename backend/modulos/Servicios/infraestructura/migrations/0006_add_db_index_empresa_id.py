from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('servicios_infra', '0005_serviciomodel_permite_sesion_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='serviciomodel',
            name='empresa_id',
            field=models.CharField(db_index=True, max_length=36),
        ),
    ]
