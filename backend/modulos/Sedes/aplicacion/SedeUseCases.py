"""
Casos de uso — Capa de Aplicación (Sedes).
Orquestan la lógica sin depender de la infraestructura directamente.
"""
from typing import List, Optional
import uuid
from ..dominio.Entidades import Sede
from ..dominio.SedeRepositoryPort import SedeRepositoryPort


class CrearSedeUseCase:
    def __init__(self, repo: SedeRepositoryPort):
        self._repo = repo

    def ejecutar(self, empresa_id: str, nombre: str, direccion: str = None,
                 ciudad: str = None, telefono: str = None) -> Sede:
        if not nombre or not nombre.strip():
            raise ValueError("El nombre de la sede es obligatorio.")
        sede = Sede(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            nombre=nombre.strip(),
            direccion=direccion,
            ciudad=ciudad,
            telefono=telefono,
            activa=True,
        )
        return self._repo.crear(sede)


class ListarSedesUseCase:
    def __init__(self, repo: SedeRepositoryPort):
        self._repo = repo

    def ejecutar(self, empresa_id: str, solo_activas: bool = False) -> List[Sede]:
        if solo_activas:
            return self._repo.listar_activas_por_empresa(empresa_id)
        return self._repo.listar_por_empresa(empresa_id)


class EditarSedeUseCase:
    def __init__(self, repo: SedeRepositoryPort):
        self._repo = repo

    def ejecutar(self, sede_id: str, empresa_id: str, nombre: str = None,
                 direccion: str = None, ciudad: str = None,
                 telefono: str = None, activa: bool = None) -> Sede:
        sede = self._repo.obtener_por_id(sede_id)
        if not sede:
            raise ValueError("Sede no encontrada.")
        if sede.empresa_id != empresa_id:
            raise PermissionError("No tienes permisos para editar esta sede.")
        if nombre is not None:
            sede.nombre = nombre.strip()
        if direccion is not None:
            sede.direccion = direccion
        if ciudad is not None:
            sede.ciudad = ciudad
        if telefono is not None:
            sede.telefono = telefono
        if activa is not None:
            sede.activa = activa
        return self._repo.actualizar(sede)


class EliminarSedeUseCase:
    def __init__(self, repo: SedeRepositoryPort):
        self._repo = repo

    def ejecutar(self, sede_id: str, empresa_id: str) -> bool:
        sede = self._repo.obtener_por_id(sede_id)
        if not sede:
            raise ValueError("Sede no encontrada.")
        if sede.empresa_id != empresa_id:
            raise PermissionError("No tienes permisos para eliminar esta sede.")
        return self._repo.desactivar(sede_id, empresa_id)
