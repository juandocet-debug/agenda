from abc import ABC, abstractmethod

class EmpresaRepositoryPort(ABC):
    @abstractmethod
    def eliminar(self, id: str) -> bool:
        pass
