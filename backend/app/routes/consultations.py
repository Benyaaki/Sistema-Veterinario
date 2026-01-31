from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.tutor import Tutor
from app.routes.auth import get_current_user
from app.services.file_service import save_upload_file
from app.services.email import send_email_sync
from pydantic import BaseModel
from beanie import PydanticObjectId

router = APIRouter()

class ConsultationCreate(BaseModel):
    patient_id: str
    date: Optional[datetime] = None
    reason: str
    anamnesis: Optional[str] = None
    physical_exam: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    exams_requested: Optional[str] = None
    status: Optional[str] = "scheduled"

class ConsultationUpdate(BaseModel):
    date: Optional[datetime] = None
    reason: Optional[str] = None
    anamnesis: Optional[str] = None
    physical_exam: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    exams_requested: Optional[str] = None
    status: Optional[str] = None

from app.services.templates import get_email_template

@router.post("/", response_model=Consultation)
async def create_consultation(
    data: ConsultationCreate, 
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user)
):
    try:
        pid = PydanticObjectId(data.patient_id)
        patient = await Patient.get(pid)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
    except:
         raise HTTPException(status_code=400, detail="Invalid Patient ID")
    
    con_data = data.model_dump()
    con_data['patient_id'] = pid
    if not con_data['date']:
        con_data['date'] = datetime.utcnow()
        
    new_con = Consultation(**con_data)
    await new_con.insert()

    # Send confirmation email
    try:
        tutor = await Tutor.get(patient.tutor_id)
        if tutor and tutor.email:
            print(f"DEBUG: Attempting to send email to {tutor.email}")
            subject = "Confirmación de Reserva - PattyVet"
            date_str = new_con.date.strftime('%d/%m/%Y %H:%M')
            
            # Fetch settings for template
            from app.models.settings import VetSettings
            settings = await VetSettings.find_one()
            template = settings.email_templates.get("appointment_confirmation") if settings else None

            if template:
                print("DEBUG: Using custom template")
                # Use dynamic template
                formatted_content = template.format(
                    tutor_name=tutor.full_name,
                    patient_name=patient.name,
                    date=date_str,
                    reason=new_con.reason,
                    reason=new_con.reason,
                    notes=f"""<br><br><div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px;"><strong>Indicaciones:</strong><br>{new_con.notes}</div>""" if new_con.notes else ""
                ).replace('\n', '<br>') # Simple newline to nice HTML conversion
                
                html_content = formatted_content
                body = formatted_content.replace('<br>', '\n') # specific naive strip for plain text
            else:
                print("DEBUG: Using default template")
                # Default Hardcoded
                body = f"""Hola {tutor.full_name},
Su hora para {patient.name} ha sido reservada con éxito.
Fecha: {date_str}
Motivo: {new_con.reason}
"""
                html_content = f"""
                <p>Hola <strong>{tutor.full_name}</strong>,</p>
                <p>Su hora para <strong>{patient.name}</strong> ha sido reservada con éxito.</p>
                <ul>
                    <li><strong>Fecha:</strong> {date_str}</li>
                    <li><strong>Motivo:</strong> {new_con.reason}</li>
                    {f'<li><strong>Indicaciones:</strong> {new_con.notes}</li>' if new_con.notes else ''}
                </ul>
                <p>Gracias por confiar en nosotros.</p>
                """
            
            html_body = get_email_template("Reserva Confirmada", html_content)
            
            print(f"DEBUG: Sending email synchronously to {tutor.email}")
            send_email_sync(tutor.email, subject, body, html_body)
        else:
            print(f"DEBUG: Tutor not found or no email. Tutor: {tutor}, Email: {tutor.email if tutor else 'None'}")
    except Exception as e:
        print(f"DEBUG: Error preparing email: {e}")
        # Log but don't fail the request
        import traceback
        traceback.print_exc()

    return new_con

# ... (Previous code remains the same until update_consultation) ...

@router.put("/{id}", response_model=Consultation)
async def update_consultation(
    id: str, 
    data: ConsultationUpdate, 
    background_tasks: BackgroundTasks,
    user = Depends(get_current_user)
):
    con = await Consultation.get(id)
    if not con:
        raise HTTPException(status_code=404, detail="Consultation not found")

    old_date = con.date
    update_data = data.model_dump(exclude_unset=True)
    await con.set(update_data)
    
    # Check if date was updated and is different
    if data.date and data.date != old_date:
        try:
            patient = await Patient.get(con.patient_id)
            if patient:
                tutor = await Tutor.get(patient.tutor_id)
                if tutor and tutor.email:
                    print(f"DEBUG: Reschedule - Sending email to {tutor.email}")
                    subject = "Tu cita ha sido reagendada - PattyVet"
                    date_str = con.date.strftime('%d/%m/%Y %H:%M')
                    
                    body = f"Hola {tutor.full_name}, Tu cita para {patient.name} ha sido reagendada para el {date_str}."
                    
                    html_content = f"""
                    <p>Hola <strong>{tutor.full_name}</strong>,</p>
                    <p>La cita para <strong>{patient.name}</strong> ha sido reagendada.</p>
                    <div style="background-color: #E6FFFA; border-left: 4px solid #38B2AC; padding: 15px; margin: 20px 0;">
                        <p style="margin:0;"><strong>Nueva Fecha:</strong> {date_str}</p>
                        <p style="margin:0;"><strong>Motivo:</strong> {con.reason}</p>
                    </div>
                    <p>Si no realizaste este cambio, por favor contáctanos de inmediato.</p>
                    """


# In update_consultation:
                    html_body = get_email_template("Cita Reagendada", html_content)
                    
                    print(f"DEBUG: Sending reschedule email synchronously to {tutor.email}")
                    send_email_sync(tutor.email, subject, body, html_body)
                else:
                    print("DEBUG: Reschedule - Tutor/Email missing")
        except Exception as e:
            print(f"Error sending reschedule email: {e}")


    return con

@router.delete("/{id}")
async def delete_consultation(id: str, user = Depends(get_current_user)):
    con = await Consultation.get(id)
    if not con:
        raise HTTPException(status_code=404, detail="Consultation not found")
    await con.delete()
    return {"message": "Deleted"}

    await con.delete()
    return {"message": "Deleted"}

@router.get("/patient/{patient_id}")
async def get_patient_consultations(patient_id: str, user = Depends(get_current_user)):
    try:
        pid = PydanticObjectId(patient_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Patient ID")
        
    consultations = await Consultation.find(Consultation.patient_id == pid).sort("-date").to_list()
    return consultations

@router.post("/{id}/files")
async def upload_consultation_file(id: str, file: UploadFile = File(...), user = Depends(get_current_user)):
    con = await Consultation.get(id)
    if not con:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    record = await save_upload_file(file, "consultation", str(con.id))
    con.file_ids.append(str(record.id))
    await con.save()
    return record

@router.delete("/{id}/files/{file_id}")
async def delete_consultation_file(id: str, file_id: str, user = Depends(get_current_user)):
    con = await Consultation.get(id)
    if not con:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    if file_id in con.file_ids:
        con.file_ids.remove(file_id)
        await con.save()
        
        # Determine if we should delete the actual file record and file from disk
        # Ideally, yes.
        from app.models.file_record import FileRecord
        import os
        from app.core.config import settings
        
        file_record = await FileRecord.get(file_id)
        if file_record:
            file_path = os.path.join(settings.UPLOAD_DIR, file_record.path)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file from disk: {e}")
            await file_record.delete()

    return {"message": "File deleted"}
