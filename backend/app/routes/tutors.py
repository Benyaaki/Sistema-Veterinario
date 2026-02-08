from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import List, Optional
from app.models.tutor import Tutor
from app.routes.auth import get_current_user
from pydantic import BaseModel, Field, EmailStr

router = APIRouter()

NAME_REGEX = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$"
PHONE_REGEX = r"^\+56 9 \d{4} \d{4}$"

class TutorCreate(BaseModel):
    first_name: str = Field(..., pattern=NAME_REGEX)
    last_name: str = Field(..., pattern=NAME_REGEX)
    phone: str = Field(..., pattern=PHONE_REGEX)
    email: Optional[EmailStr] = None
    notes: Optional[str] = None
    is_tutor: bool = True
    is_client: bool = True

class TutorUpdate(BaseModel):
    first_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    last_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    phone: Optional[str] = Field(None, pattern=PHONE_REGEX)
    email: Optional[EmailStr] = None
    notes: Optional[str] = None
    discount_percent: Optional[float] = None
    is_tutor: Optional[bool] = None
    is_client: Optional[bool] = None

@router.post("/", response_model=Tutor)
async def create_tutor(request: Request, tutor: TutorCreate, user = Depends(get_current_user)):
    new_tutor = Tutor(**tutor.model_dump())
    await new_tutor.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="CLIENT_ADD",
        description=f"Cliente registrado: {new_tutor.first_name} {new_tutor.last_name}",
        reference_id=str(new_tutor.id),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return new_tutor

@router.get("/", response_model=List[Tutor])
async def get_tutors(
    response: Response,
    search: Optional[str] = None, 
    filter: Optional[str] = None,
    role: Optional[str] = "all", # tutor, client, all
    limit: int = 50, 
    skip: int = 0, 
    user = Depends(get_current_user)
):
    # Base Query
    query_filters = {}
    
    if search:
        # Prefix Search (starts with)
        pattern = f"^{search}.*"
        query_filters["$or"] = [
            {"first_name": {"$regex": pattern, "$options": "i"}},
            {"last_name": {"$regex": pattern, "$options": "i"}},
            {"phone": {"$regex": pattern, "$options": "i"}} 
        ]

    # Apply specialized filters
    if filter == "debt":
        query_filters["debt"] = {"$gt": 0}
    elif filter == "discount":
        query_filters["discount_percent"] = {"$gt": 0}
        
    # Role Filtering
    if role == "tutor":
        query_filters["is_tutor"] = True
    elif role == "client":
        query_filters["is_client"] = True

    # Execute
    if query_filters:
        query = Tutor.find(query_filters)
        total = await query.count()
        response.headers["X-Total-Count"] = str(total)
        
        # If searching, sort by relevance (name match)
        if search:
            results = await query.to_list()
            search_lower = search.lower()
            results.sort(key=lambda t: (
                not (t.first_name and t.first_name.lower().startswith(search_lower)),
                t.first_name
            ))
            return results[skip : skip + limit]
        
        return await query.sort("first_name", "last_name").limit(limit).skip(skip).to_list()
    
    # No filters, default all
    total = await Tutor.find_all().count()
    response.headers["X-Total-Count"] = str(total)
    return await Tutor.find_all().sort("first_name", "last_name").limit(limit).skip(skip).to_list()

@router.get("/{id}", response_model=Tutor)
async def get_tutor(id: str, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return tutor

@router.put("/{id}", response_model=Tutor)
async def update_tutor(request: Request, id: str, update_data: TutorUpdate, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    data = update_data.model_dump(exclude_unset=True)
    await tutor.set(data)

    # Log Activity
    field_map = {
        "first_name": "Nombre",
        "last_name": "Apellido",
        "phone": "Teléfono",
        "email": "Correo",
        "notes": "Notas",
        "discount_percent": "Descuento (%)",
        "is_tutor": "Es Tutor",
        "is_client": "Es Cliente"
    }
    changed_fields = list(data.keys())
    translated_fields = [field_map.get(f, f) for f in changed_fields]
    
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="CLIENT_EDIT",
        description=f"Editó información del cliente: {tutor.first_name} {tutor.last_name}. Campos: {', '.join(translated_fields)}",
        reference_id=id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        metadata={"fields_changed": changed_fields}
    )
    
    return tutor
@router.delete("/{id}")
async def delete_tutor(request: Request, id: str, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    name = f"{tutor.first_name} {tutor.last_name}"
    await tutor.delete()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="CLIENT_DELETE",
        description=f"Registro eliminado: {name}",
        reference_id=id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"message": "Tutor deleted"}

@router.get("/{id}/details")
async def get_tutor_details(id: str, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Get all patients for this tutor
    from app.models.patient import Patient
    from beanie.operators import Or
    patients = await Patient.find(
        Or(Patient.tutor_id == tutor.id, Patient.tutor2_id == tutor.id)
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
    
    # Get Sales Stats
    from app.models.sale import Sale
    sales = await Sale.find(Sale.customer_id == tutor.id, Sale.status == "COMPLETED").to_list()
    total_spent = sum(s.total for s in sales)
    total_purchases = len(sales)

    return {
        "tutor": tutor,
        "patients": patients,
        "consultations": consultations,
        "stats": {
            "total_appointments": total_appointments,
            "attended": attended,
            "no_shows": no_shows,
            "formatted_attendance": f"{attended}/{total_appointments}" if total_appointments > 0 else "0/0",
            "total_spent": total_spent,
            "total_purchases": total_purchases
        }
    }

class DebtPayment(BaseModel):
    amount: float = Field(..., gt=0)

@router.post("/{id}/pay-debt", response_model=Tutor)
async def pay_debt(id: str, payment: DebtPayment, user = Depends(get_current_user)):
    tutor = await Tutor.get(id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    if payment.amount > tutor.debt:
        # Optional: You might want to allow it and have negative debt (credit)?
        # For now, let's just reduce it, even if it goes below 0 (credit balance)
        pass # Allow overpayment as credit? Or clamp? 
             # Let's simple reduce. Logic says "pay what is owed". 
             # If user pays more, it becomes credit. OK.

    tutor.debt -= payment.amount
    await tutor.save()
    
    # Log activity? Optional but good practice.
    
    return tutor
