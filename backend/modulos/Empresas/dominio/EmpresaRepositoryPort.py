from abc import ABC, abstractmethod

class EmpresaRepositoryPort(ABC):
    @abstractmethod
    def eliminar(self, id: str) -> bool:
        pass

    @abstractmethod
    def obtener_empresas_publicas_paginadas(self, request) -> dict:
        """Devuelve un diccionario con los datos paginados de las empresas públicas activas"""
        pass
