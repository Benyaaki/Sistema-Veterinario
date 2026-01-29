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
        
        required_cols = ['tutor_email']
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
                # tutor_name is optional if tutor exists, but better to provide it if we want to create it
                name_val = row.get('tutor_name')
                name = str(name_val).strip() if pd.notna(name_val) else None
                
                phone_val = row.get('tutor_phone')
                phone = str(phone_val).strip() if pd.notna(phone_val) else None
                
                tutor = await Tutor.find_one(Tutor.email == email)
                
                if not tutor:
                    if not name:
                        stats["errors"].append(f"Row {index + 2}: Missing tutor_name for new tutor {email}")
                        continue
                        
                    tutor = Tutor(
                        full_name=name,
                        email=email,
                        phone=phone,
                        address=""
                    )
                    await tutor.insert()
                    stats["tutors_created"] += 1
                else:
                    # Update info if provided
                    updated = False
                    if name and name != tutor.full_name:
                        tutor.full_name = name
                        updated = True
                    if phone and phone != tutor.phone:
                        tutor.phone = phone
                        updated = True
                    
                    if updated:
                        await tutor.save()
                        stats["tutors_updated"] += 1
                
                # 2. Handle Patient (Only if patient_name is present and filled)
                if 'patient_name' in df.columns and pd.notna(row['patient_name']):
                    p_name = str(row['patient_name']).strip()
                    if p_name:
                        if 'species' not in df.columns:
                             stats["errors"].append(f"Row {index + 2}: Missing 'species' column for patient {p_name}")
                             continue

                        species_raw = str(row.get('species', 'Otro')).strip()
                        
                        # Logic for species/custom species
                        if species_raw in ["Perro", "Gato"]:
                            species_val = species_raw
                        else:
                            species_val = species_raw # Capture custom species directly

                        breed_val = row.get('breed')
                        breed = str(breed_val).strip() if pd.notna(breed_val) else "Mestizo"
                        
                        sex_val = row.get('sex')
                        sex = str(sex_val).strip() if pd.notna(sex_val) else "Desconocido"
                        
                        color_val = row.get('color')
                        color = str(color_val).strip() if pd.notna(color_val) else ""
                        
                        # Check if patient already exists for this tutor to avoid duplicates? 
                        # For now, simplistic check or just add (user might want to add another pet with same name? unlikely but possible)
                        # Let's assume unique name per tutor for safety? No, allow duplicates for now, admin can clean up.
                        
                        patient = Patient(
                            name=p_name,
                            species=species_val,
                            breed=breed,
                            sex=sex,
                            color=color,
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
