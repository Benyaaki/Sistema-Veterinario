from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from app.models.patient import Patient, Species
from app.models.tutor import Tutor
from app.routes.auth import get_current_user
from pydantic import BaseModel, Field
from beanie import PydanticObjectId

router = APIRouter()

class PatientCreate(BaseModel):
    name: str
    species: str
    breed: str
    sex: str
    color: str
    birth_date: Optional[datetime] = None
    weight: Optional[float] = None
    allergies: Optional[str] = None
    notes: Optional[str] = None
    tutor_id: str
    tutor2_id: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    sex: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[datetime] = None
    weight: Optional[float] = None
    allergies: Optional[str] = None
    notes: Optional[str] = None
    tutor_id: Optional[str] = None
    tutor2_id: Optional[str] = None

@router.post("/", response_model=Patient)
async def create_patient(patient_data: PatientCreate, user = Depends(get_current_user)):
    # Verify tutor exists
    try:
        tutor_oid = PydanticObjectId(patient_data.tutor_id)
        tutor = await Tutor.get(tutor_oid)
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid Tutor ID")
        
    p_data = patient_data.model_dump()
    p_data['tutor_id'] = tutor_oid
    
    if p_data.get('tutor2_id'):
        try:
            p_data['tutor2_id'] = PydanticObjectId(p_data['tutor2_id'])
        except:
             p_data['tutor2_id'] = None
    else:
        p_data['tutor2_id'] = None

    new_patient = Patient(**p_data)
    await new_patient.insert()
    return new_patient

@router.get("/", response_model=List[Patient])
async def get_patients(search: Optional[str] = None, limit: int = 50, skip: int = 0, user = Depends(get_current_user)):
    query = Patient.find_all()
    if search:
        query = Patient.find({"name": {"$regex": search, "$options": "i"}})
    return await query.limit(limit).skip(skip).to_list()

class PatientWithDetails(Patient):
    tutor: Optional[Tutor] = None
    tutor2: Optional[Tutor] = None

@router.get("/{id}", response_model=PatientWithDetails)
async def get_patient(id: str, user = Depends(get_current_user)):
    patient = await Patient.get(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    response = PatientWithDetails(**patient.model_dump())
    
    if patient.tutor_id:
        response.tutor = await Tutor.get(patient.tutor_id)
        
    if patient.tutor2_id:
        response.tutor2 = await Tutor.get(patient.tutor2_id)
        
    return response

@router.put("/{id}", response_model=Patient)
async def update_patient(id: str, update_data: PatientUpdate, user = Depends(get_current_user)):
    patient = await Patient.get(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    data = update_data.model_dump(exclude_unset=True)
    if 'tutor_id' in data:
         data['tutor_id'] = PydanticObjectId(data['tutor_id'])
    if 'tutor2_id' in data and data['tutor2_id']:
         data['tutor2_id'] = PydanticObjectId(data['tutor2_id'])

    await patient.set(data)
    return patient

@router.delete("/{id}")
async def delete_patient(id: str, user = Depends(get_current_user)):
    patient = await Patient.get(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await patient.delete()
    return {"message": "Patient deleted"}
