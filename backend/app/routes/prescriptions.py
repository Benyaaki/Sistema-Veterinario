from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from app.models.prescription import Prescription, PrescriptionItem
from app.models.patient import Patient
from app.models.settings import VetSettings
from app.routes.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from beanie import PydanticObjectId
from fastapi.responses import Response

# For PDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import io

router = APIRouter()

class PrescriptionCreate(BaseModel):
    patient_id: str
    consultation_id: Optional[str] = None
    date: Optional[datetime] = None
    general_instructions: Optional[str] = None
    items: List[PrescriptionItem]

class PrescriptionUpdate(BaseModel):
    date: Optional[datetime] = None
    general_instructions: Optional[str] = None
    items: Optional[List[PrescriptionItem]] = None

@router.post("/", response_model=Prescription)
async def create_prescription(data: PrescriptionCreate, user = Depends(get_current_user)):
    try:
        pid = PydanticObjectId(data.patient_id)
        if not await Patient.get(pid):
             raise HTTPException(status_code=404, detail="Patient not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid Patient ID")

    p_data = data.model_dump()
    p_data['patient_id'] = pid
    if p_data.get('consultation_id'):
        try:
             p_data['consultation_id'] = PydanticObjectId(p_data['consultation_id'])
        except:
             p_data['consultation_id'] = None
    else:
         p_data['consultation_id'] = None
         
    if not p_data['date']:
        p_data['date'] = datetime.utcnow()
    
    # Auto-assign signature from current user if available?
    # Or frontend sends it? The requirement says "Permitir guardar firma en Ajustes... y usarla".
    # We can store the user's signature file ID in the prescription?
    # Or just burn it into the PDF.
    # We'll store it Reference if user has one.
    if user.signature_file_id:
        p_data['signature_file_id'] = user.signature_file_id

    new_p = Prescription(**p_data)
    await new_p.insert()
    return new_p

@router.get("/patient/{patient_id}", response_model=List[Prescription])
async def get_patient_prescriptions(patient_id: str, user = Depends(get_current_user)):
    try:
         pid = PydanticObjectId(patient_id)
    except:
        return []
    return await Prescription.find(Prescription.patient_id == pid).sort("-date").to_list()

@router.get("/{id}", response_model=Prescription)
async def get_prescription(id: str, user = Depends(get_current_user)):
    p = await Prescription.get(id)
    if not p:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return p

from app.models.tutor import Tutor

@router.get("/{id}/pdf")
async def generate_prescription_pdf(id: str, user = Depends(get_current_user)):
    p = await Prescription.get(id)
    if not p:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    patient = await Patient.get(p.patient_id)
    tutor = None
    if patient.tutor_id:
        tutor = await Tutor.get(patient.tutor_id)
        
    vet_settings = await VetSettings.find_one()
    if not vet_settings:
        vet_settings = VetSettings() # Default
    
    # Generate PDF
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # --- Background Image ---
    import os
    # Base dir is app/routes/.. -> app/.. -> backend/
    # Actually, let's use a robust way relative to this file
    current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/app/routes
    backend_dir = os.path.dirname(os.path.dirname(current_dir)) # backend
    bg_path = os.path.join(backend_dir, "static", "img", "recetario.png")
    try:
        c.drawImage(bg_path, 0, 0, width=width, height=height)
    except Exception:
        pass # Fallback to no background if missing

    # --- Header Bar (Cyan) ---
    # Attempt to match the "blue bar" look if the background doesn't provide it strictly enough, 
    # OR assuming the simple background needs overlaid text.
    # Based on reference image, there is a distinct header area.
    # We will draw the TEXT over the assumed header area.
    c.setFillColor(colors.white) # Assuming white text on blue background for header (if visible over wave)
    # The Date on the top right
    c.setFont("Helvetica-Bold", 12)
    # Date adjusted: "aun mas a la derecha"
    date_str = p.date
    # Adjusted position: more right (width - 180)
    c.drawString(width - 180, height - 35, f"Dia: {date_str.day}   Mes: {date_str.month}   Año: {date_str.year}")
    
    # --- Info Section (Black Text) ---
    c.setFillColor(colors.black)
    # "Responsable quiero esté más abajo centrado entre las lineas rosas"
    # Moving down significantly from height-140 to height-230
    y_info = height - 230 
    line_spacing = 25
    
    # Row 1: Responsable
    # Removed Rut as requested
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y_info, "Responsable:")
    c.setFont("Helvetica", 11)
    c.drawString(120, y_info, tutor.full_name if tutor else "Unknown")
    
    # Row 2: Dirección
    y_info -= line_spacing
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y_info, "Dirección:")
    c.setFont("Helvetica", 11)
    c.drawString(120, y_info, tutor.address if tutor and tutor.address else "-")
    
    # Row 3: Paciente / Especie
    y_info -= line_spacing
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y_info, "Paciente:")
    c.setFont("Helvetica", 11)
    c.drawString(120, y_info, patient.name)
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(350, y_info, "Especie:")
    c.setFont("Helvetica", 11)
    c.drawString(400, y_info, patient.species)

    # Row 4: Raza / Sexo
    y_info -= line_spacing
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y_info, "Raza:")
    c.setFont("Helvetica", 11)
    c.drawString(120, y_info, patient.breed)
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(350, y_info, "Sexo:")
    c.setFont("Helvetica", 11)
    c.drawString(400, y_info, patient.sex)
    
    # --- Body ---
    y_body = y_info - 50 # More space after info
    c.setFont("Helvetica-BoldOblique", 14)
    c.drawString(40, y_body, "Rp.:")
    
    y_body -= 30
    c.setFont("Helvetica-Bold", 12)
    
    for item in p.items:
        c.drawString(60, y_body, f"• {item.medication}")
        y_body -= 15
        
        c.setFont("Helvetica", 11)
        details = f"{item.dose} via {item.frequency} durante {item.duration}"
        c.drawString(70, y_body, details)
        y_body -= 15
        
        if item.instructions:
            c.setFont("Helvetica-Oblique", 10)
            c.drawString(70, y_body, f"({item.instructions})")
            y_body -= 15
        
        y_body -= 10
        c.setFont("Helvetica-Bold", 12)

    if p.general_instructions:
        y_body -= 10
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y_body, "Indicaciones:")
        y_body -= 15
        c.setFont("Helvetica", 11)
        
        # Text wrapping
        from reportlab.lib.utils import simpleSplit
        # Available width: Page width - (Left margin + Right margin)
        # 40 left margin, let's say 40 right margin = width - 80
        lines = simpleSplit(p.general_instructions, "Helvetica", 11, width - 80)
        for line in lines:
            c.drawString(40, y_body, line)
            y_body -= 15
        
    # --- Footer ---
    y_footer = 50 
    c.setFillColor(colors.white) # Match date color
    c.setFont("Helvetica-Bold", 11)
    # Only "Firma:" as requested
    c.drawString(40, y_footer, "Firma:")
    
    # Doctor info: "un poco más arriba y a la derecha"
    y_doc_info = y_footer + 10 # Up a bit
    x_doc_info = width - 30 # Right a bit more (margin 40 -> 30)
    
    c.drawRightString(x_doc_info, y_doc_info, "Dra. Patty Pizarro Espina")
    c.setFont("Helvetica", 9)
    c.drawRightString(x_doc_info, y_doc_info - 12, "Médico Veterinario")
    c.drawRightString(x_doc_info, y_doc_info - 24, "Patty.pizarroespina@gmail.com")
    c.drawRightString(x_doc_info, y_doc_info - 36, "+56 9 9713 6180")

    c.showPage()
    c.save()
    
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=receta_{patient.name}.pdf"})

