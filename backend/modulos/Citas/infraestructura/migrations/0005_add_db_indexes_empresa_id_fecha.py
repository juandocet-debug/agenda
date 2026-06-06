from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('citas_infra', '0004_alter_horarioempresamodel_unique_together_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='citamodel',
            name='empresa_id',
            field=models.CharField(db_index=True, max_length=36),
        ),
        migrations.AlterField(
            model_name='citamodel',
            name='fecha',
            field=models.DateField(db_index=True),
        ),
    ]
