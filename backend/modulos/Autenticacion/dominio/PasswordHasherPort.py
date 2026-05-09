from abc import ABC, abstractmethod

class PasswordHasherPort(ABC):
    @abstractmethod
    def hash(self, plain_text: str) -> str:
        pass

    @abstractmethod
    def verify(self, plain_text: str, hashed_text: str) -> bool:
        pass
