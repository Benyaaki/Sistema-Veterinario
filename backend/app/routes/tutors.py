from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.models.tutor import Tutor
from app.routes.auth import get_current_user
from pydantic import BaseModel, Field

router = APIRouter()

class TutorCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class TutorUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

@router.post("/", response_model=Tutor)
async def create_tutor(tutor: TutorCreate, user = Depends(get_current_user)):
    new_tutor = Tutor(**tutor.model_dump())
    await new_tutor.insert()
    return new_tutor

@router.get("/", response_model=List[Tutor])
async def get_tutors(search: Optional[str] = None, limit: int = 50, skip: int = 0, user = Depends(get_current_user)):
    query = Tutor.find_all()
    if search:
        # Simple regex search for name or phone
        # Note: In production, consider text index
        import re
        pattern = f".*{search}.*"
        query = Tutor.find({
            "$or": [
                {"full_name": {"$regex": pattern, "$options": "i"}},
                {"phone": {"$regex": pattern, "$options": "i"}}
            ]
        })
    
    return await query.limit(limit).skip(skip).to_list()

@router.get("/{id}", response_model=Tutor)
async def get_tutor(id: str, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return tutor

@router.put("/{id}", response_model=Tutor)
async def update_tutor(id: str, update_data: TutorUpdate, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    await tutor.set(update_data.model_dump(exclude_unset=True))
    return tutor

    
    await tutor.delete()
    return {"message": "Tutor deleted"}

@router.get("/{id}/details")
async def get_tutor_details(id: str, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Get all patients for this tutor
    from app.models.patient import Patient
    patients = await Patient.find(
        {"$or": [{"tutor_id": tutor.id}, {"tutor2_id": tutor.id}]}
    ).to_list()
    
    # Get consultations for these patients
    from app.models.consultation import Consultation
    patient_ids = [p.id for p in patients]
    consultations = await Consultation.find(
        {"patient_id": {"$in": patient_ids}}
    ).sort("-date").to_list()
    
    # Calculate stats
    total_appointments = len(consultations)
    attended = len([c for c in consultations if c.status == "attended"])
    no_shows = len([c for c in consultations if c.status == "no_show"])
    
    return {
        "tutor": tutor,
        "patients": patients,
        "consultations": consultations,
        "stats": {
            "total_appointments": total_appointments,
            "attended": attended,
            "no_shows": no_shows,
            "formatted_attendance": f"{attended}/{total_appointments}" if total_appointments > 0 else "0/0"
        }
    }
