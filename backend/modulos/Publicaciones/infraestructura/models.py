from django.db import models

class PublicacionModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    empresa_id = models.CharField(max_length=36, db_index=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    imagen_url = models.TextField(blank=True, null=True)   # Retrocompatibilidad
    imagenes = models.JSONField(default=list, blank=True)  # Lista de base64/URLs
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresas_publicaciones'
        ordering = ['-fecha_creacion']


class LikeModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    publicacion_id = models.CharField(max_length=36, db_index=True)
    usuario_id = models.CharField(max_length=36)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'publicaciones_likes'
        unique_together = ('publicacion_id', 'usuario_id')


class ComentarioModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    publicacion_id = models.CharField(max_length=36, db_index=True)
    usuario_id = models.CharField(max_length=36)
    autor_nombre = models.CharField(max_length=150, blank=True, null=True)
    texto = models.TextField()
    padre_id = models.CharField(max_length=36, blank=True, null=True)  # Para respuestas
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'publicaciones_comentarios'
        ordering = ['fecha_creacion']


class LikeComentarioModel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    comentario_id = models.CharField(max_length=36, db_index=True)
    usuario_id = models.CharField(max_length=36)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comentarios_likes'
        unique_together = ('comentario_id', 'usuario_id')
