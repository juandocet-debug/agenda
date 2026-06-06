from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profesionales', '0003_alter_profesionalmodel_foto_url'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profesionalmodel',
            name='empresa_id',
            field=models.CharField(db_index=True, max_length=36),
        ),
    ]
