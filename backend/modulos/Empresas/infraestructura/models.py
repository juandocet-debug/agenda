import uuid
from django.db import models
from encrypted_model_fields.fields import EncryptedCharField


class CategoriaModel(models.Model):
    """Categoría de empresa administrable desde el Super Admin."""
    id = models.CharField(max_length=36, primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=80, unique=True)
    icono = models.CharField(
        max_length=40, blank=True, null=True,
        help_text='Nombre de ícono Feather, ej: scissors, coffee, heart'
    )
    orden = models.PositiveIntegerField(default=0)
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresas_categorias'
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class EmpresaModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    nombre = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    logo_url = models.TextField(blank=True, null=True)
    foto_portada_url = models.TextField(blank=True, null=True)
    color_primario = models.CharField(max_length=7, default='#000000')
    color_secundario = models.CharField(max_length=7, default='#FFFFFF')
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    pais = models.CharField(max_length=100, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    correo_contacto = models.EmailField(blank=True, null=True)
    moneda = models.CharField(max_length=3, default='COP')
    mensaje_advertencia = models.TextField(blank=True, null=True)
    
    # Nuevos campos de facturación y legalidad
    nit = models.CharField(max_length=50, blank=True, null=True)
    rut_archivo = models.FileField(upload_to='empresas/ruts/', blank=True, null=True)
    
    categoria = models.ForeignKey(
        CategoriaModel, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='empresas', db_column='categoria_id'
    )
    
    # Credenciales de Wompi (BYOG) — cifradas con Fernet en reposo
    wompi_public_key = EncryptedCharField(max_length=100, blank=True, null=True)
    wompi_integrity_key = EncryptedCharField(max_length=100, blank=True, null=True)
    wompi_events_secret = EncryptedCharField(max_length=100, blank=True, null=True)
    
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

class BannerPublicitarioModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    titulo = models.CharField(max_length=150)
    imagen_url = models.TextField()
    link_url = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresas_banners'
