from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.models.patient import Patient
from app.models.tutor import Tutor
from app.models.consultation import Consultation
from app.routes.auth import get_current_user
from beanie.operators import GTE

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(user = Depends(get_current_user)):
    total_patients = await Patient.count()
    total_tutors = await Tutor.count()
    
    # Consultations today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    consultations_today = await Consultation.find(
        Consultation.date >= today_start,
        Consultation.date < today_end
    ).count()
    
    return {
        "total_patients": total_patients,
        "total_tutors": total_tutors,
        "consultations_today": consultations_today
    }

@router.get("/today")
async def get_today_consultations(user = Depends(get_current_user)):
    # Start and end of today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    consultations = await Consultation.find(
        Consultation.date >= today_start,
        Consultation.date < today_end
    ).sort("date").to_list()
    
    result = []
    result = []
    for c in consultations:
        patient = await Patient.get(c.patient_id)
        
        # Ensure UTC timezone is indicated
        date_str = c.date.isoformat() + 'Z' if c.date.tzinfo is None else c.date.isoformat()

        result.append({
            "id": str(c.id),
            "date": date_str,
            "reason": c.reason,
            "patient_name": patient.name if patient else "Desconocido",
            "patient_species": patient.species if patient else ""
        })
        
    return result

@router.get("/upcoming")
async def get_upcoming_consultations(limit: int = 5, user = Depends(get_current_user)):
    now = datetime.utcnow()
    # Fetch upcoming consultations
    consultations = await Consultation.find(
        Consultation.date >= now
    ).sort("date").limit(limit).to_list()
    
    # Enrich with patient data
    result = []
    for c in consultations:
        patient = await Patient.get(c.patient_id)
        
        # Ensure UTC timezone is indicated
        date_str = c.date.isoformat() + 'Z' if c.date.tzinfo is None else c.date.isoformat()
        
        result.append({
            "id": str(c.id),
            "date": date_str,
            "reason": c.reason,
            "patient_name": patient.name if patient else "Desconocido",
            "patient_species": patient.species if patient else ""
        })
        
    return result

@router.get("/calendar")
async def get_calendar_events(
    start: datetime,
    end: datetime,
    user = Depends(get_current_user)
):
    consultations = await Consultation.find(
        Consultation.date >= start,
        Consultation.date <= end
    ).to_list()
    
    events = []
    for c in consultations:
        patient = await Patient.get(c.patient_id)
        
        # Ensure UTC timezone is indicated if naive
        start_date = c.date
        end_date = c.date + timedelta(minutes=30)
        
        # If naive, assume UTC and append Z. If aware, isoformat will include offset.
        # But safest for standard JS consumption is forcing ISO with Z if it's really UTC.
        # Since we use datetime.utcnow(), it is naive but represents UTC.
        start_str = start_date.isoformat() + 'Z' if start_date.tzinfo is None else start_date.isoformat()
        end_str = end_date.isoformat() + 'Z' if end_date.tzinfo is None else end_date.isoformat()

        events.append({
            "id": str(c.id),
            "title": f"{patient.name} ({patient.species.value if hasattr(patient.species, 'value') else patient.species})" if patient else "Desconocido",
            "start": start_str,
            "end": end_str, 
            "reason": c.reason,
            "patient_id": str(c.patient_id)
        })
        
    return events
