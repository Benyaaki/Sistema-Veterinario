from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, List

class Exam(Document):
    patient_id: PydanticObjectId
    consultation_id: Optional[PydanticObjectId] = None
    type: str # hemograma, rx, etc
    date: datetime = datetime.utcnow()
    result_text: Optional[str] = None
    file_ids: List[str] = []
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "exams"
