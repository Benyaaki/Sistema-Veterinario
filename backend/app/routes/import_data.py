from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.models.user import User
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.routes.auth import get_current_user
from typing import Annotated
import pandas as pd
import io

router = APIRouter()

@router.post("/csv")
async def import_csv_data(
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        content = await file.read()
        # Decode considering utf-8 or latin-1 usually used in Excel
        try:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        except UnicodeDecodeError:
            df = pd.read_csv(io.StringIO(content.decode('latin-1')))
            
        # Normalize headers: lowercase and strip
        df.columns = [c.lower().strip() for c in df.columns]
        
        required_cols = ['tutor_email', 'tutor_name', 'patient_name', 'species']
        missing_cols = [c for c in required_cols if c not in df.columns]
        
        if missing_cols:
             raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing_cols)}")
             
        stats = {
            "tutors_created": 0,
            "tutors_updated": 0,
            "patients_created": 0,
            "errors": []
        }
        
        for index, row in df.iterrows():
            try:
                # 1. Handle Tutor
                email = str(row['tutor_email']).strip().lower()
                name = str(row['tutor_name']).strip()
                phone = str(row.get('tutor_phone', '')).strip()
                
                tutor = await Tutor.find_one(Tutor.email == email)
                if not tutor:
                    tutor = Tutor(
                        full_name=name,
                        email=email,
                        phone=phone if phone != 'nan' else None,
                        address=""
                    )
                    await tutor.insert()
                    stats["tutors_created"] += 1
                else:
                    # Optional: Update phone if missing? For now just link.
                    stats["tutors_updated"] += 1
                
                # 2. Handle Patient
                p_name = str(row['patient_name']).strip()
                species_raw = str(row['species']).strip()
                
                # Logic for species/custom species
                if species_raw in ["Perro", "Gato"]:
                    species_val = species_raw
                else:
                    species_val = "Otro" 
                    # If we had a custom_species field logic in CSV we'd map it here, 
                    # but for now we'll just store "Otro" OR 
                    # based on previous logic, we might want to store the actual string if it's not Perro/Gato?
                    # The PatientForm logic stores the custom string in `species` field directly if it's not Perro/Gato.
                    # Let's do that for consistency with the recent PatientForm changes.
                    species_val = species_raw

                breed = str(row.get('breed', '')).strip()
                sex = str(row.get('sex', '')).strip()
                
                patient = Patient(
                    name=p_name,
                    species=species_val,
                    breed=breed if breed != 'nan' else "Mestizo",
                    sex=sex if sex != 'nan' else "Desconocido",
                    color=str(row.get('color', '')).strip(),
                    tutor_id=tutor.id
                )
                await patient.insert()
                stats["patients_created"] += 1
                
            except Exception as e:
                stats["errors"].append(f"Row {index + 2}: {str(e)}")
                
        return stats

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
