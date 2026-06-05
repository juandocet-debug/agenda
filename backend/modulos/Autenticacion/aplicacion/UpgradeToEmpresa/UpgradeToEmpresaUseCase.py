import uuid
from typing import Optional
from django.core.files.uploadedfile import UploadedFile

from modulos.Usuarios.infraestructura.models import UsuarioModel
from modulos.Empresas.infraestructura.models import EmpresaModel

class UpgradeToEmpresaUseCase:
    def run(self, usuario_id: str, nombre_empresa: str, nit: str, rut_archivo: Optional[UploadedFile]) -> None:
        # 1. Buscar usuario
        try:
            usuario = UsuarioModel.objects.get(id=usuario_id)
        except UsuarioModel.DoesNotExist:
            raise ValueError("El usuario no existe.")
            
        if usuario.rol == 'empresa':
            raise ValueError("El usuario ya es una empresa.")

        # 2. Crear la Empresa
        base_slug = nombre_empresa.lower().replace(" ", "-")
        slug_final = base_slug
        if EmpresaModel.objects.filter(slug=base_slug).exists():
            slug_final = f"{base_slug}-{usuario_id[:4]}"

        # Guardamos la empresa con el mismo ID del usuario
        empresa = EmpresaModel.objects.create(
            id=usuario_id,
            nombre=nombre_empresa,
            nit=nit,
            slug=slug_final
        )
        
        # 3. Guardar el archivo RUT si viene adjunto
        if rut_archivo:
            empresa.rut_archivo = rut_archivo
            empresa.save()

        # 4. Actualizar rol a empresa
        usuario.rol = 'empresa'
        usuario.save()
