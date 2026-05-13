import uuid
from ..dominio.PublicacionRepositoryPort import PublicacionRepositoryPort
from ..dominio.Entidades import Publicacion

class CrearPublicacionUseCase:
    def __init__(self, repositorio: PublicacionRepositoryPort):
        self.repositorio = repositorio

    def ejecutar(self, empresa_id: str, datos: dict) -> Publicacion:
        titulo = datos.get('titulo', '').strip()
        descripcion = datos.get('descripcion', '').strip()
        imagen_url = datos.get('imagen_url', '')
        imagenes = datos.get('imagenes', [])  # Lista de imágenes
        # Si no se pasa lista pero sí imagen_url individual, la usamos como lista
        if not imagenes and imagen_url:
            imagenes = [imagen_url]

        if not titulo:
            raise ValueError("El título de la publicación es obligatorio.")

        publicacion = Publicacion(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            titulo=titulo,
            descripcion=descripcion,
            imagen_url=imagen_url,
            imagenes=imagenes,
        )
        return self.repositorio.guardar(publicacion)
