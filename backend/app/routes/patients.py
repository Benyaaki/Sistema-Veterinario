from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from datetime import datetime
from app.models.patient import Patient, Species
from app.models.tutor import Tutor
from app.routes.auth import get_current_user
from pydantic import BaseModel, Field
from beanie import PydanticObjectId

router = APIRouter()

NAME_REGEX = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$"

class PatientCreate(BaseModel):
    name: str = Field(..., pattern=NAME_REGEX)
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
    name: Optional[str] = Field(None, pattern=NAME_REGEX)
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
async def create_patient(request: Request, patient_data: PatientCreate, user = Depends(get_current_user)):
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
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="PATIENT_ADD",
        description=f"Paciente agregado: {new_patient.name} ({new_patient.species})",
        reference_id=str(new_patient.id),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return new_patient

@router.get("/", response_model=List[Patient])
async def get_patients(search: Optional[str] = None, limit: int = 50, skip: int = 0, user = Depends(get_current_user)):
    query = Patient.find_all()
    if search:
        query = Patient.find({"name": {"$regex": search, "$options": "i"}})
    return await query.sort("name").limit(limit).skip(skip).to_list()

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
async def update_patient(request: Request, id: str, update_data: PatientUpdate, user = Depends(get_current_user)):
    patient = await Patient.get(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    data = update_data.model_dump(exclude_unset=True)
    if 'tutor_id' in data:
         data['tutor_id'] = PydanticObjectId(data['tutor_id'])
    if 'tutor2_id' in data and data['tutor2_id']:
         data['tutor2_id'] = PydanticObjectId(data['tutor2_id'])

    await patient.set(data)

    # Log Activity
    field_map = {
        "name": "Nombre",
        "species": "Especie",
        "breed": "Raza",
        "sex": "Sexo",
        "color": "Color",
        "birth_date": "F. Nacimiento",
        "weight": "Peso",
        "allergies": "Alergias",
        "notes": "Notas",
        "tutor_id": "Tutor Principal",
        "tutor2_id": "Tutor Secundario"
    }
    changed_fields = list(data.keys())
    translated_fields = [field_map.get(f, f) for f in changed_fields]
    
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="PATIENT_EDIT",
        description=f"Editó información del paciente: {patient.name}. Campos: {', '.join(translated_fields)}",
        reference_id=id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        metadata={"fields_changed": changed_fields}
    )
    
    return patient

@router.delete("/{id}")
async def delete_patient(request: Request, id: str, user = Depends(get_current_user)):
    patient = await Patient.get(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    name = patient.name
    await patient.delete()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="PATIENT_DELETE",
        description=f"Paciente eliminado: {name}",
        reference_id=id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"message": "Patient deleted"}
