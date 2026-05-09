from dataclasses import dataclass

@dataclass(frozen=True)
class PasswordHash:
    value: str
