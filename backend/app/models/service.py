from beanie import Document
from typing import Optional
from datetime import datetime

class Service(Document):
    name: str
    price: float
    category: str  # Consulta, Vacuna, Cirugia, Examen, Otro
    active: bool = True
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "services"
