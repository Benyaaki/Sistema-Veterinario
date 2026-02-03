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
    discount_percent: Optional[float] = None

@router.post("/", response_model=Tutor)
async def create_tutor(tutor: TutorCreate, user = Depends(get_current_user)):
    new_tutor = Tutor(**tutor.model_dump())
    await new_tutor.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="CLIENT_ADD",
        description=f"Cliente registrado: {new_tutor.full_name}",
        reference_id=str(new_tutor.id)
    )
    
    return new_tutor

@router.get("/", response_model=List[Tutor])
async def get_tutors(
    search: Optional[str] = None, 
    filter: Optional[str] = None,
    limit: int = 50, 
    skip: int = 0, 
    user = Depends(get_current_user)
):
    # Base Query
    query_filters = {}
    
    if search:
        import re
        pattern = f"^{search}.*" # Prefix Search
        query_filters["$or"] = [
            {"full_name": {"$regex": pattern, "$options": "i"}},
            {"phone": {"$regex": pattern, "$options": "i"}} 
        ]

    # Apply specialized filters
    if filter == "debt":
        query_filters["debt"] = {"$gt": 0}
    elif filter == "discount":
        query_filters["discount_percent"] = {"$gt": 0}

    # Execute
    if query_filters:
        query = Tutor.find(query_filters)
        
        # If searching, sort by relevance (name match)
        if search:
            results = await query.to_list()
            search_lower = search.lower()
            results.sort(key=lambda t: (
                not (t.full_name and t.full_name.lower().startswith(search_lower)),
                t.full_name
            ))
            return results[skip : skip + limit]
        
        return await query.limit(limit).skip(skip).to_list()
    
    # No filters, default all
    return await Tutor.find_all().limit(limit).skip(skip).to_list()

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
