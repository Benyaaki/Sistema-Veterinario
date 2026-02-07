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
    branch_id: Optional[str] = None
    appointment_type: str = "VET"
    assigned_staff_id: Optional[str] = None

class ConsultationUpdate(BaseModel):
    date: Optional[datetime] = None
    reason: Optional[str] = None
    anamnesis: Optional[str] = None
    physical_exam: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    exams_requested: Optional[str] = None
    status: Optional[str] = "scheduled"
    # v2.0
    branch_id: Optional[str] = None
    appointment_type: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    reference_sale_id: Optional[str] = None

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
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="APPOINTMENT",
        description=f"Cita agendada para {patient.name} ({new_con.appointment_type}) - {new_con.reason}",
        branch_id=PydanticObjectId(new_con.branch_id) if new_con.branch_id else None,
        reference_id=str(new_con.id)
    )

    # Send confirmation email
    try:
        tutor = await Tutor.get(patient.tutor_id)
        if tutor and tutor.email:
            print(f"DEBUG: Attempting to send email to {tutor.email}")
            subject = "Confirmación de Reserva - CalFer"
            date_str = new_con.date.strftime('%d/%m/%Y %H:%M')
            
            # Fetch Branch for dynamic info
            from app.models.branch import Branch
            app_branch = await Branch.get(new_con.branch_id) if new_con.branch_id else None
            branch_name = app_branch.name if app_branch else "CalFer"
            branch_phone = app_branch.phone if app_branch and app_branch.phone else "+56 9 4862 0501"

            # Fetch settings for template
            from app.models.settings import VetSettings
            settings = await VetSettings.find_one()
            template = settings.email_templates.get("appointment_confirmation") if settings else None

            if template:
                print("DEBUG: Using custom template")
                # Use dynamic template
                formatted_content = template.format(
                    tutor_name=f"{tutor.first_name} {tutor.last_name}",
                    patient_name=patient.name,
                    date=date_str,
                    reason=new_con.reason,
                    branch_name=branch_name,
                    branch_phone=branch_phone,
                    notes=f"""<br><br><div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px;"><strong>Indicaciones:</strong><br>{new_con.notes}</div>""" if new_con.notes else ""
                ).replace('\n', '<br>') # Simple newline to nice HTML conversion
                
                html_content = formatted_content
                if "{branch_name}" not in template:
                    import re
                    # Look for "Motivo: [reason]" and insert Sucursal below it
                    reason_escaped = re.escape(str(new_con.reason))
                    pattern = rf"(Motivo:.*?{reason_escaped})"
                    sucursal_line = f"Sucursal: {branch_name}"
                    
                    if re.search(pattern, html_content):
                        html_content = re.sub(pattern, rf"\1<br>{sucursal_line}", html_content)
                    else:
                        html_content += f"<p>{sucursal_line}</p>"
                
                body = formatted_content.replace('<br>', '\n')
                if "{branch_name}" not in template:
                    body += f"\nSucursal: {branch_name}"
            else:
                print("DEBUG: Using default template")
                # Prepare type string for default template
                type_map = {"VET": "veterinaria", "GROOMING": "peluquería"}
                app_type_str = type_map.get(new_con.appointment_type, "atención")

                # Default Hardcoded
                body = f"""Hola {tutor.first_name} {tutor.last_name},
Tu hora de {app_type_str} para {patient.name} ha sido reservada con éxito en {branch_name}.
Fecha: {date_str}
Motivo: {new_con.reason}

Si tienes alguna pregunta, no dudes en contactarnos vía WhatsApp o llamando al: {branch_phone}
"""
                html_content = f"""
                <p>Hola <strong>{tutor.first_name} {tutor.last_name}</strong>,</p>
                <p>Tu hora de <strong>{app_type_str}</strong> para <strong>{patient.name}</strong> ha sido reservada con éxito en <strong>{branch_name}</strong>.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Detalles de la Cita</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Fecha:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{date_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Motivo:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{new_con.reason}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Sucursal:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{branch_name}</td>
                        </tr>
                        {f'<tr><td style="padding: 8px 0; color: #64748b; font-size: 14px; vertical-align: top;">Notas:</td><td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-style: italic;">{new_con.notes}</td></tr>' if new_con.notes else ''}
                    </table>
                </div>
                
                <p>Te recordamos que si necesitas cancelar o modificar tu cita, por favor avísanos con al menos 24 horas de antelación.</p>
                <p>¡Esperamos verte pronto!</p>
                """
            
            html_body = get_email_template("Reserva Confirmada", html_content, phone=branch_phone)
            
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
    notify_tutor: bool = False,
    user = Depends(get_current_user)
):
    con = await Consultation.get(id)
    if not con:
        raise HTTPException(status_code=404, detail="Consultation not found")

    old_date = con.date
    update_data = data.model_dump(exclude_unset=True)
    
    # Logic: Grooming Check
    if update_data.get("status") == "attended":
        # Check current type OR updated type
        c_type = update_data.get("appointment_type", con.appointment_type)
        if c_type == "GROOMING":
             has_sale = con.reference_sale_id or update_data.get("reference_sale_id")
             if not has_sale:
                 raise HTTPException(status_code=400, detail="Grooming appointments require a Sale before finishing.")

    await con.set(update_data)
    
    # Check if date was updated and is different AND notification is requested
    if notify_tutor and data.date and data.date != old_date:
        try:
            patient = await Patient.get(con.patient_id)
            if patient:
                tutor = await Tutor.get(patient.tutor_id)
                if tutor and tutor.email:
                    app_type_map = {"VET": "veterinaria", "GROOMING": "peluquería"}
                    app_type_str = app_type_map.get(con.appointment_type, "atención")

                    # Fetch Branch for dynamic info
                    from app.models.branch import Branch
                    app_branch = await Branch.get(con.branch_id) if con.branch_id else None
                    branch_name = app_branch.name if app_branch else "CalFer"
                    branch_phone = app_branch.phone if app_branch and app_branch.phone else "+56 9 4862 0501"

                    print(f"DEBUG: Reschedule - Sending email to {tutor.email}")
                    subject = "Tu cita ha sido reagendada - CalFer"
                    date_str = con.date.strftime('%d/%m/%Y %H:%M')
                    
                    body = f"Hola {tutor.first_name} {tutor.last_name}, Tu cita de {app_type_str} para {patient.name} ha sido reagendada para el {date_str} en {branch_name}.\n\nSi tienes preguntas contáctanos al: {branch_phone}"
                    
                    html_content = f"""
                    <p>Hola <strong>{tutor.first_name} {tutor.last_name}</strong>,</p>
                    <p>Te informamos que la cita de <strong>{app_type_str}</strong> para <strong>{patient.name}</strong> ha sido reagendada exitosamente.</p>
                    
                    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0369a1;">Nueva Información</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Fecha:</td>
                                <td style="padding: 8px 0; color: #0369a1; font-size: 14px; font-weight: 600;">{date_str}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Motivo:</td>
                                <td style="padding: 8px 0; color: #334155; font-size: 14px;">{con.reason}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Sucursal:</td>
                                <td style="padding: 8px 0; color: #334155; font-size: 14px;">{branch_name}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px;">Si no realizaste este cambio o deseas modificarlo nuevamente, por favor contáctanos de inmediato.</p>
                    """


# In update_consultation:
                    html_body = get_email_template("Cita Reagendada", html_content, phone=branch_phone)
                    
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
    
    # Get patient info before deleting
    patient = await Patient.get(con.patient_id)
    pat_name = patient.name if patient else "Desconocido"
    date_str = con.date.strftime('%d/%m/%Y') if con.date else "N/A"
    
    await con.delete()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="APPOINTMENT_DELETE",
        description=f"Atención eliminada para {pat_name} (Fecha: {date_str})",
        branch_id=PydanticObjectId(con.branch_id) if con.branch_id else None,
        reference_id=id
    )
    
    return {"message": "Deleted"}

@router.get("/patient/{patient_id}")
async def get_patient_consultations(patient_id: str, user = Depends(get_current_user)):
    try:
        pid = PydanticObjectId(patient_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Patient ID")
        
    consultations = await Consultation.find(Consultation.patient_id == pid).sort("-date").to_list()
    
    # Enrich with full file records
    from app.models.file_record import FileRecord
    from beanie.operators import In

    all_file_ids = []
    for c in consultations:
        all_file_ids.extend(c.file_ids)
        
    if all_file_ids:
        files = await FileRecord.find(In(FileRecord.id, [PydanticObjectId(fid) for fid in all_file_ids])).to_list()
        files_map = {str(f.id): f for f in files}
        
        result = []
        for c in consultations:
            c_dict = c.model_dump()
            c_dict['_id'] = str(c.id) # Ensure _id is present for frontend compatibility
            c_dict['id'] = str(c.id)
            c_dict['files'] = []
            for fid in c.file_ids:
                if fid in files_map:
                    c_dict['files'].append(files_map[fid])
            result.append(c_dict)
        return result

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
