from beanie import Document
from typing import Dict, Optional
from datetime import datetime

class VetSettings(Document):
    clinic_name: str = "Paty Veterinaria"
    rut: Optional[str] = None
    address: str = "Dirección"
    phone: str = "Teléfono"
    fax: Optional[str] = None
    email: str = "contacto@paty.vet"
    website: Optional[str] = None
    city: str = "Ciudad"
    policy_text: Optional[str] = "Gracias por su compra."
    logo_url: Optional[str] = None
    
    email_templates: Dict[str, str] = {
        "appointment_confirmation": "Hola {tutor_name},\n\nSu hora para {patient_name} ha sido reservada con éxito.\nFecha: {date}\nMotivo: {reason}\n{notes}\n\nGracias por confiar en CalFer."
    }
    
    schedule: Dict[str, str] = {
        "monday": "09:00-19:00",
        "tuesday": "09:00-19:00",
        "wednesday": "09:00-19:00",
        "thursday": "09:00-19:00",
        "friday": "09:00-19:00",
        "saturday": "10:00-14:00",
        "sunday": "Cerrado"
    }

    updated_at: datetime = datetime.utcnow()

    class Settings:
        name = "vet_settings"
