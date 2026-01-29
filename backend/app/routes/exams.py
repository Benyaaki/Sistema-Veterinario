from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime
from app.models.exam import Exam
from app.models.patient import Patient
from app.routes.auth import get_current_user
from app.services.file_service import save_upload_file
from pydantic import BaseModel
from beanie import PydanticObjectId

router = APIRouter()

class ExamCreate(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    type: str
    date: Optional[datetime] = None
    result_text: Optional[str] = None

class ExamUpdate(BaseModel):
    type: Optional[str] = None
    date: Optional[datetime] = None
    result_text: Optional[str] = None

from fastapi import Form
from app.models.file_record import FileRecord

class FileDTO(BaseModel):
    id: str
    original_name: str
    comment: Optional[str] = None
    created_at: datetime

class ExamWithFiles(Exam):
    files: List[FileDTO] = []

@router.post("/", response_model=Exam)
async def create_exam(data: ExamCreate, user = Depends(get_current_user)):
    try:
        pid = PydanticObjectId(data.patient_id)
        if not await Patient.get(pid):
             raise HTTPException(status_code=404, detail="Patient not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid Patient ID")

    exam_data = data.model_dump()
    exam_data['patient_id'] = pid
    if exam_data.get('consultation_id'):
        try:
            exam_data['consultation_id'] = PydanticObjectId(exam_data['consultation_id'])
        except:
             exam_data['consultation_id'] = None
    else:
        exam_data['consultation_id'] = None
        
    if not exam_data['date']:
        exam_data['date'] = datetime.utcnow()
        
    new_exam = Exam(**exam_data)
    await new_exam.insert()
    return new_exam

@router.get("/patient/{patient_id}", response_model=List[ExamWithFiles])
async def get_patient_exams(patient_id: str, user = Depends(get_current_user)):
    try:
         pid = PydanticObjectId(patient_id)
    except:
        return []
        
    exams = await Exam.find(Exam.patient_id == pid).sort("-date").to_list()
    result = []
    
    for exam in exams:
        # Fetch files for this exam
        # We can query FileRecord by owner_id and owner_type='exam'
        files = await FileRecord.find(
            FileRecord.owner_id == str(exam.id),
            FileRecord.owner_type == "exam"
        ).to_list()
        
        file_dtos = [
            FileDTO(
                id=str(f.id), 
                original_name=f.original_name, 
                comment=f.comment,
                created_at=f.created_at
            ) for f in files
        ]
        
        exam_dict = exam.model_dump()
        exam_dict['files'] = file_dtos
        result.append(ExamWithFiles(**exam_dict))
        
    return result

@router.get("/{id}", response_model=Exam)
async def get_exam(id: str, user = Depends(get_current_user)):
    exam = await Exam.get(id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.put("/{id}", response_model=Exam)
async def update_exam(id: str, data: ExamUpdate, user = Depends(get_current_user)):
    exam = await Exam.get(id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    await exam.set(data.model_dump(exclude_unset=True))
    return exam

@router.delete("/{id}")
async def delete_exam(id: str, user = Depends(get_current_user)):
    exam = await Exam.get(id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    await exam.delete()
    return {"message": "Deleted"}

@router.post("/{id}/files")
async def upload_exam_file(
    id: str, 
    file: UploadFile = File(...), 
    comment: Optional[str] = Form(None),
    user = Depends(get_current_user)
):
    exam = await Exam.get(id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    record = await save_upload_file(file, "exam", str(exam.id), comment=comment)
    exam.file_ids.append(str(record.id))
    await exam.save()
    return record
