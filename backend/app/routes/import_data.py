from fastapi import APIRouter, UploadFile, File, HTTPException
import csv
from io import StringIO
from typing import List, Optional
from app.models.tutor import Tutor
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.branch import Branch
from app.models.stock import Stock
from beanie import PydanticObjectId

router = APIRouter()

def parse_currency(value: str, is_percentage: bool = False) -> float:
    if not value or str(value).strip() == "":
        return 0.0
    
    # Remove symbols
    clean_val = str(value).replace('$', '').replace('%', '').strip()
    
    # Handle thousands/decimal separators
    # If there's a dot AND a comma, dot is thousands, comma is decimal
    if '.' in clean_val and ',' in clean_val:
        clean_val = clean_val.replace('.', '').replace(',', '.')
    elif ',' in clean_val:
        # If there's only a comma, it's likely decimal
        clean_val = clean_val.replace(',', '.')
    elif '.' in clean_val:
        # If there's only a dot, it could be thousands (1.064) or decimal (1.5)
        # In Chile, dots are typically thousands.
        # But for small numbers (like 19.0 or 0.19), it's likely decimal.
        parts = clean_val.split('.')
        if not is_percentage and len(parts[-1]) == 3:
            # Likely thousands separator: 1.064
            clean_val = clean_val.replace('.', '')
        else:
            # Likely decimal or small number: 19.0 or 1.5
            pass

    try:
        return float(clean_val)
    except ValueError:
        return 0.0

def get_row_val(row: dict, *possible_keys: str) -> Optional[str]:
    """Search for a value in a dictionary with case-insensitive and stripped keys."""
    normalized_keys = [k.strip().lower() for k in possible_keys]
    for key, value in row.items():
        if key and key.strip().lower() in normalized_keys:
            return str(value) if value is not None else None
    return None

@router.post("/tutors")
async def import_tutors(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    if not file.filename.endswith(".txt") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser .txt o .csv")
    
    if delete_existing:
        await Tutor.find_all().delete()

    content = await file.read()
    decoded = ""
    for enc in ["utf-8-sig", "latin-1", "utf-8"]:
        try:
            decoded = content.decode(enc)
            break
        except:
            continue
    
    if not decoded:
        raise HTTPException(status_code=400, detail="No se pudo decodificar el archivo")

    # Detect delimiter
    delimiter = ','
    if ';' in decoded.split('\n')[0]:
        delimiter = ';'

    csv_reader = csv.DictReader(StringIO(decoded), delimiter=delimiter)
    tutors_to_insert = []
    
    for row in csv_reader:
        try:
            first_name = get_row_val(row, "Nombre", "first_name") or ""
            last_name = get_row_val(row, "Apellidos", "last_name") or ""
            full_name = get_row_val(row, "full_name") or f"{first_name} {last_name}".strip()
            
            if not first_name and not last_name and not full_name:
                continue

            phone = get_row_val(row, "Teléfono", "phone") or ""
            email = get_row_val(row, "Email", "email")
            total_spent = get_row_val(row, "Total gastado", "total_spent")
            
            notes = f"Importado. Gasto Histórico: {total_spent}" if total_spent else ""
            
            tutor = Tutor(
                first_name=first_name if first_name else full_name,
                last_name=last_name if last_name else "",
                phone=phone,
                email=email,
                notes=notes,
                discount_percent=0.0
            )
            tutors_to_insert.append(tutor)
        except Exception as e:
            print(f"Error parsing tutor row: {e}")
            continue

    if tutors_to_insert:
        await Tutor.insert_many(tutors_to_insert)
    
    return {"message": f"Se han importado {len(tutors_to_insert)} clientes exitosamente"}

@router.post("/products")
async def import_products(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    if not file.filename.endswith(".txt") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser .txt o .csv")
    
    try:
        if delete_existing:
            await Product.find_all().delete()
            await Stock.find_all().delete()

        content = await file.read()
        decoded = ""
        for enc in ["utf-8-sig", "latin-1", "utf-8"]:
            try:
                decoded = content.decode(enc)
                break
            except:
                continue
        
        # Detect delimiter
        delimiter = ','
        first_line = decoded.split('\n')[0]
        if ';' in first_line:
            delimiter = ';'

        csv_reader = csv.DictReader(StringIO(decoded), delimiter=delimiter)
        
        products_to_insert = []
        stocks_data = [] # List of (product_obj, {branch_name: qty})
        
        branches_cache = {}
        all_branches = await Branch.find_all().to_list()
        for b in all_branches:
            if b.name:
                branches_cache[b.name.upper().strip()] = b

        async def get_or_create_branch(branch_name: str) -> Branch:
            norm_name = branch_name.upper().strip()
            if norm_name in branches_cache:
                return branches_cache[norm_name]
            new_branch = Branch(name=branch_name, is_active=True)
            await new_branch.create()
            branches_cache[norm_name] = new_branch
            return new_branch

        row_count = 0
        skipped_count = 0

        for row in csv_reader:
            row_count += 1
            try:
                name = get_row_val(row, "Nombre Artículo", "name")
                if not name:
                    skipped_count += 1
                    continue

                sku = get_row_val(row, "UPC/EAN/ISBN", "sku")
                category = get_row_val(row, "Categoría", "category")
                supplier_name = get_row_val(row, "Nombre de la Compañía", "supplier_name")
                
                p_price = parse_currency(get_row_val(row, "Precio de Compra", "purchase_price") or "0")
                s_price = parse_currency(get_row_val(row, "Precio de Venta", "sale_price") or "0")
                tax = parse_currency(get_row_val(row, "Porcentaje de Impuesto(s)", "tax_percent") or "0", is_percentage=True)
                avatar = get_row_val(row, "Avatar", "image_url")
                
                ext_id_str = get_row_val(row, "Id", "external_id")
                ext_id = None
                if ext_id_str:
                    try:
                        ext_id = int(float(ext_id_str))
                    except:
                        pass

                product = Product(
                    external_id=ext_id,
                    name=name,
                    sku=sku,
                    category=category,
                    supplier_name=supplier_name,
                    purchase_price=p_price,
                    sale_price=s_price,
                    tax_percent=tax,
                    avatar=avatar,
                    kind="PRODUCT",
                    is_active=True
                )
                products_to_insert.append(product)
                
                # Parse branch stock columns
                branch_stocks = {}
                for key, value in row.items():
                    if key and "Cantidad en Stock" in key:
                        # Extract branch name: "Cantidad en Stock [BODEGA]" -> "BODEGA"
                        branch_name = key.replace("Cantidad en Stock", "").replace("[", "").replace("]", "").strip()
                        if branch_name == "VENCIMIENTO" or not branch_name:
                            continue
                        
                        qty = int(parse_currency(value or "0"))
                        branch_stocks[branch_name] = qty
                
                stocks_data.append((product, branch_stocks))

            except Exception as e:
                print(f"Error parsing product row {row_count}: {e}")
                skipped_count += 1
                continue

        if products_to_insert:
            # We must insert products first to get their IDs
            await Product.insert_many(products_to_insert)
            
            stocks_to_insert = []
            for product, branch_map in stocks_data:
                for branch_name, qty in branch_map.items():
                    branch = await get_or_create_branch(branch_name)
                    stocks_to_insert.append(Stock(
                        branch_id=branch.id,
                        product_id=product.id,
                        quantity=qty
                    ))
            
            if stocks_to_insert:
                await Stock.insert_many(stocks_to_insert)
        
        msg = f"Importación finalizada. {len(products_to_insert)} productos creados."
        if skipped_count > 0:
            msg += f" {skipped_count} filas omitidas por falta de nombre o errores."
        
        return {"message": msg}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.post("/suppliers")
async def import_suppliers(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    if not file.filename.endswith(".txt") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser .txt o .csv")
    
    if delete_existing:
        await Supplier.find_all().delete()

    content = await file.read()
    decoded = ""
    for enc in ["utf-8-sig", "latin-1", "utf-8"]:
        try:
            decoded = content.decode(enc)
            break
        except:
            continue
            
    delimiter = ','
    if ';' in decoded.split('\n')[0]:
        delimiter = ';'

    csv_reader = csv.DictReader(StringIO(decoded), delimiter=delimiter)
    suppliers_to_insert = []
    
    for row in csv_reader:
        try:
            company_name = get_row_val(row, "Nombre de la Compañía", "name") or get_row_val(row, "Nombre de la Agencia")
            if not company_name:
                last = get_row_val(row, "Apellidos") or ""
                first = get_row_val(row, "Nombre") or ""
                company_name = f"{first} {last}".strip()
            
            if not company_name:
                continue

            contact_name = f"{get_row_val(row, 'Nombre') or ''} {get_row_val(row, 'Apellidos') or ''}".strip()
            
            supplier = Supplier(
                name=company_name,
                contact_name=contact_name,
                phone=get_row_val(row, "Teléfono", "phone"),
                email=get_row_val(row, "Email", "email"),
                is_active=True
            )
            suppliers_to_insert.append(supplier)
        except Exception as e:
            print(f"Error parsing supplier row: {e}")
            continue

    if suppliers_to_insert:
        await Supplier.insert_many(suppliers_to_insert)
    
    return {"message": f"Se han importado {len(suppliers_to_insert)} proveedores exitosamente"}
