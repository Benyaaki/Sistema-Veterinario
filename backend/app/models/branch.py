from beanie import Document
from typing import Optional

class Branch(Document):
    name: str # Rancagua, Olivar, San Francisco, etc.
    address: Optional[str] = None
    phone: Optional[str] = None
    supports_grooming: bool = False
    supports_veterinary: bool = True
    is_active: bool = True

    class Settings:
        name = "branches"
