from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional
from enum import Enum

class Species(str, Enum):
    DOG = "Perro"
    CAT = "Gato"
    OTHER = "Otro"

class Patient(Document):
    name: str
    species: str
    breed: str
    sex: str
    color: str
    birth_date: Optional[datetime] = None
    weight: Optional[float] = None
    allergies: Optional[str] = None
    notes: Optional[str] = None
    tutor_id: PydanticObjectId
    tutor2_id: Optional[PydanticObjectId] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "patients"
