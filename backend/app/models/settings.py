from beanie import Document
from typing import Dict, Optional
from datetime import datetime

class VetSettings(Document):
    clinic_name: str = "CalFer"
    rut: Optional[str] = None
    address: str = "Dirección"
    phone: str = "Teléfono"
    fax: Optional[str] = None
    email: str = "contacto@calfer.cl"
    website: Optional[str] = None
    city: str = "Ciudad"
    policy_text: Optional[str] = "Gracias por su compra."
    logo_url: Optional[str] = None
    
    email_templates: Dict[str, str] = {
        "appointment_confirmation": "Hola {tutor_name},<br><br>Tu hora para {patient_name} ha sido reservada con éxito en {branch_name}.<br><br><strong>Detalles de la cita:</strong><br>Fecha: {date}<br>Motivo: {reason}<br>Sucursal: {branch_name}<br>{notes}<br><br>Gracias por confiar en CalFer."
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
