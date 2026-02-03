from fastapi import APIRouter, UploadFile, File, HTTPException
import csv
from io import StringIO
from typing import List
from app.models.tutor import Tutor
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.branch import Branch
from app.models.stock import Stock

router = APIRouter()

@router.post("/tutors")
async def import_tutors(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    if not file.filename.endswith(".txt") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .txt or .csv file")
    
    if delete_existing:
        await Tutor.find_all().delete()

    content = await file.read()
    
    # Try different encodings
    decoded = ""
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin-1")
        except UnicodeDecodeError:
            decoded = content.decode("utf-8", errors="ignore")

    # Handle BOM if present
    if decoded.startswith('\ufeff'):
        decoded = decoded[1:]

    csv_reader = csv.DictReader(StringIO(decoded))
    
    # Check headers to verify format or fallback
    # Expected: Id,Apellidos,Nombre,Email,Teléfono,"Total gastado"
    
    tutors_to_insert = []
    for row in csv_reader:
        try:
            # Map fields
            # "Apellidos" + "Nombre" -> full_name
            last_name = row.get("Apellidos") or row.get("last_name") or ""
            first_name = row.get("Nombre") or row.get("first_name") or ""
            
            full_name = f"{first_name} {last_name}".strip()
            if not full_name:
                full_name = row.get("full_name") or "Cliente Sin Nombre"

            phone = row.get("Teléfono") or row.get("phone") or ""
            email = row.get("Email") or row.get("email")
            
            # Handle Total Gastado -> Notes
            total_spent = row.get("Total gastado") or row.get("total_spent")
            notes = ""
            if total_spent:
                notes = f"Importado. Gasto Histórico: {total_spent}"
            
            # Additional notes if existing
            existing_notes = row.get("notes")
            if existing_notes:
                notes = f"{notes} | {existing_notes}" if notes else existing_notes

            tutor = Tutor(
                full_name=full_name,
                phone=phone,
                email=email,
                address=row.get("address"),
                notes=notes,  # Store historical spending here
                discount_percent=0.0
            )
            tutors_to_insert.append(tutor)
        except Exception as e:
            print(f"Error parsing row {row}: {e}")
            continue

    if tutors_to_insert:
        await Tutor.insert_many(tutors_to_insert)
    
    return {"message": f"Se han importado {len(tutors_to_insert)} clientes exitosamente"}

@router.post("/products")
async def import_products(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    # ... (existing product code is fine, but I'll skip replacing it if I can target ranges, but replacing whole block is safer/easier to read here if I don't want to mess up offsets. 
    # Actually I can just target the other functions. I'll split into two ReplaceChunks if possible, or just replace the tutor one and then the supplier one.
    pass 
    # WAIT, I can't leave pass here if I'm replacing content. 
    # I will stick to replacing separate blocks or the whole file content for clarity if needed, 
    # but `replace_file_content` checks single contiguous block.
    # I will replace `import_tutors` first.

# ... skipping this tool call construction to rethink strategy.
# I need to replace `import_tutors` block AND `import_suppliers` block.
# They are at top and bottom.
# I should use `multi_replace_file_content`.

@router.post("/products")
async def import_products(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    if not file.filename.endswith(".txt") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .txt or .csv file")
    
    try:
        # Optional: Clear existing products and stocks if requested
        if delete_existing:
            print("Deleting existing data...")
            await Product.find_all().delete()
            print("Products deleted.")
            await Stock.find_all().delete()
            print("Stocks deleted.")

        content = await file.read()
        
        # Try different encodings
        decoded = ""
        try:
            decoded = content.decode("utf-8-sig")
        except UnicodeDecodeError:
             try:
                decoded = content.decode("latin-1")
             except:
                decoded = content.decode("utf-8", errors="ignore")

        csv_file = StringIO(decoded)
        csv_reader = csv.DictReader(csv_file, delimiter=',')
        
        products_to_insert = []
        stocks_to_insert = []
        
        # Cache branches to avoid repeated DB lookups
        from app.models.branch import Branch
        from app.models.stock import Stock
        
        branches_cache = {}
        all_branches = await Branch.find_all().to_list()
        for b in all_branches:
            if b.name:
                branches_cache[b.name.upper().strip()] = b

        async def get_or_create_branch(branch_name: str) -> Branch:
            norm_name = branch_name.upper().strip()
            if norm_name in branches_cache:
                return branches_cache[norm_name]
            
            # Create new branch
            new_branch = Branch(name=branch_name, is_active=True)
            await new_branch.create()
            branches_cache[norm_name] = new_branch
            return new_branch

        def parse_currency(value: str) -> float:
            if not value:
                return 0.0
            clean_val = value.replace('$', '').replace('.', '').strip()
            clean_val = clean_val.replace(',', '.')
            try:
                return float(clean_val)
            except ValueError:
                return 0.0

        for row in csv_reader:
            try:
                name = row.get("Nombre Artículo") or row.get("name")
                if not name:
                    continue

                sku = row.get("UPC/EAN/ISBN") or row.get("sku")
                category = row.get("Categoría") or row.get("category")
                supplier_name = row.get("Nombre de la Compañía") or row.get("supplier_name")
                
                p_price = parse_currency(row.get("Precio de Compra", row.get("purchase_price", "0")))
                s_price = parse_currency(row.get("Precio de Venta", row.get("sale_price", "0")))

                product = Product(
                    name=name,
                    sku=sku,
                    category=category,
                    supplier_name=supplier_name,
                    purchase_price=p_price,
                    sale_price=s_price,
                    kind="PRODUCT",
                    is_active=True
                )
                products_to_insert.append(product)
                
                # Temp store stock data
                product.temp_stock_data = {}
                
                for key, value in row.items():
                    if key and key.strip().replace('"', '').startswith("Cantidad en Stock"):
                        branch_name = key.strip().replace('"', '').replace("Cantidad en Stock", "").strip()
                        if branch_name == "VENCIMIENTO": 
                            continue 
                        
                        try:
                            qty = int(float(value)) if value else 0
                        except ValueError:
                            qty = 0
                        
                        product.temp_stock_data[branch_name] = qty

            except Exception as e:
                print(f"Error parsing row {row}: {e}")
                continue

        if products_to_insert:
            await Product.insert_many(products_to_insert)
            
            for product in products_to_insert:
                if hasattr(product, 'temp_stock_data'):
                    for branch_name, qty in product.temp_stock_data.items():
                        branch = await get_or_create_branch(branch_name)
                        stock = Stock(
                            branch_id=branch.id,
                            product_id=product.id,
                            quantity=qty
                        )
                        stocks_to_insert.append(stock)
        
        if stocks_to_insert:
            await Stock.insert_many(stocks_to_insert)
        
        return {"message": f"Se han importado {len(products_to_insert)} productos exitosamente"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/suppliers")
async def import_suppliers(
    file: UploadFile = File(...),
    delete_existing: bool = False
):
    if not file.filename.endswith(".txt") and not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .txt or .csv file")
    
    if delete_existing:
        await Supplier.find_all().delete()

    content = await file.read()
    
    # Try different encodings
    decoded = ""
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin-1")
        except UnicodeDecodeError:
            decoded = content.decode("utf-8", errors="ignore")
            
    csv_reader = csv.DictReader(StringIO(decoded))
    
    suppliers_to_insert = []
    for row in csv_reader:
        # Expected: Id, "Nombre de la Compañía", "Nombre de la Agencia", Categoria, Apellidos, Nombre, Email, Teléfono
        try:
            company_name = row.get("Nombre de la Compañía") or row.get("name")
            if not company_name:
                # Fallback to agency name or contact
                company_name = row.get("Nombre de la Agencia")
            if not company_name:
                # If still no name, maybe use "Nombre" + "Apellidos" as the company name if it's a person-supplier
                last = row.get("Apellidos") or ""
                first = row.get("Nombre") or ""
                if last or first:
                    company_name = f"{first} {last}".strip()
            
            if not company_name:
                continue # Skip if no name identifiable

            # Contact Name
            last_name = row.get("Apellidos") or ""
            first_name = row.get("Nombre") or ""
            contact_name = f"{first_name} {last_name}".strip()
            
            supplier = Supplier(
                name=company_name,
                contact_name=contact_name,
                phone=row.get("Teléfono") or row.get("phone"),
                email=row.get("Email") or row.get("email"),
                address=row.get("address"), # File doesn't seem to have address, but we keep mapping
                rut=row.get("rut"),
                is_active=True
            )
            suppliers_to_insert.append(supplier)
        except Exception as e:
            print(f"Error parsing row {row}: {e}")
            continue

    if suppliers_to_insert:
        await Supplier.insert_many(suppliers_to_insert)
    
    return {"message": f"Se han importado {len(suppliers_to_insert)} proveedores exitosamente"}
