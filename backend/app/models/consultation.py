from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, List

class Consultation(Document):
    patient_id: PydanticObjectId
    date: datetime = datetime.utcnow()
    reason: Optional[str] = None
    anamnesis: Optional[str] = None
    physical_exam: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    exams_requested: Optional[str] = None
    file_ids: List[str] = []
    status: str = "scheduled" # scheduled, attended, no_show
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Settings:
        name = "consultations"
