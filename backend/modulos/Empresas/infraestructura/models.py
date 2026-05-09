from django.db import models

class EmpresaModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    nombre = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    color_primario = models.CharField(max_length=7, default='#000000')
    color_secundario = models.CharField(max_length=7, default='#FFFFFF')
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresas_saas'

class NoticiaModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    empresa = models.ForeignKey(EmpresaModel, on_delete=models.CASCADE, related_name='noticias')
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    fecha_publicacion = models.DateTimeField()

    class Meta:
        db_table = 'empresas_noticias'
