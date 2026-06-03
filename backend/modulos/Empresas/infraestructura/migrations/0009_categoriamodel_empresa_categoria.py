from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('empresas_infra', '0008_bannerpublicitariomodel'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategoriaModel',
            fields=[
                ('id', models.CharField(max_length=36, primary_key=True, serialize=False)),
                ('nombre', models.CharField(max_length=80, unique=True)),
                ('icono', models.CharField(
                    max_length=40, blank=True, null=True,
                    help_text='Nombre de ícono Feather, ej: scissors, coffee, heart'
                )),
                ('orden', models.PositiveIntegerField(default=0)),
                ('activa', models.BooleanField(default=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'empresas_categorias',
                'ordering': ['orden', 'nombre'],
            },
        ),
        migrations.AddField(
            model_name='empresamodel',
            name='categoria',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='empresas',
                to='empresas_infra.categoriamodel',
                db_column='categoria_id',
            ),
        ),
    ]
