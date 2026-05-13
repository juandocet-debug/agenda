class Publicacion:
    def __init__(self, id: str, empresa_id: str, titulo: str, descripcion: str,
                 imagen_url: str = None, imagenes: list = None, fecha_creacion: str = None,
                 total_likes: int = 0, total_comentarios: int = 0, usuario_dio_like: bool = False):
        self.id = id
        self.empresa_id = empresa_id
        self.titulo = titulo
        self.descripcion = descripcion
        self.imagen_url = imagen_url
        self.imagenes = imagenes or ([]  if imagen_url is None else [imagen_url])
        self.fecha_creacion = fecha_creacion
        self.total_likes = total_likes
        self.total_comentarios = total_comentarios
        self.usuario_dio_like = usuario_dio_like

    def dict(self):
        imgs = self.imagenes if self.imagenes else ([self.imagen_url] if self.imagen_url else [])
        return {
            "id": self.id,
            "empresa_id": self.empresa_id,
            "titulo": self.titulo,
            "descripcion": self.descripcion,
            "imagen_url": self.imagen_url,
            "imagenes": imgs,
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
            "total_likes": self.total_likes,
            "total_comentarios": self.total_comentarios,
            "usuario_dio_like": self.usuario_dio_like,
        }


class Like:
    def __init__(self, id: str, publicacion_id: str, usuario_id: str, fecha_creacion: str = None):
        self.id = id
        self.publicacion_id = publicacion_id
        self.usuario_id = usuario_id
        self.fecha_creacion = fecha_creacion

    def dict(self):
        return {
            "id": self.id,
            "publicacion_id": self.publicacion_id,
            "usuario_id": self.usuario_id,
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
        }


class Comentario:
    def __init__(self, id: str, publicacion_id: str, usuario_id: str, texto: str,
                 autor_nombre: str = None, padre_id: str = None, fecha_creacion: str = None,
                 respuestas: list = None, total_likes: int = 0, usuario_dio_like: bool = False):
        self.id = id
        self.publicacion_id = publicacion_id
        self.usuario_id = usuario_id
        self.texto = texto
        self.autor_nombre = autor_nombre
        self.padre_id = padre_id
        self.fecha_creacion = fecha_creacion
        self.respuestas = respuestas or []
        self.total_likes = total_likes
        self.usuario_dio_like = usuario_dio_like

    def dict(self):
        return {
            "id": self.id,
            "publicacion_id": self.publicacion_id,
            "usuario_id": self.usuario_id,
            "texto": self.texto,
            "autor_nombre": self.autor_nombre,
            "padre_id": self.padre_id,
            "fecha_creacion": str(self.fecha_creacion) if self.fecha_creacion else None,
            "respuestas": [r.dict() for r in self.respuestas],
            "total_likes": self.total_likes,
            "usuario_dio_like": self.usuario_dio_like,
        }

