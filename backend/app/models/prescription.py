from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class PrescriptionItem(BaseModel):
    medication: str
    dose: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class Prescription(Document):
    patient_id: PydanticObjectId
    consultation_id: Optional[PydanticObjectId] = None
    date: datetime = datetime.utcnow()
    general_instructions: Optional[str] = None
    items: List[PrescriptionItem] = []
    signature_file_id: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "prescriptions"
