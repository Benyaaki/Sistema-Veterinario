import asyncio
from app.core.database import init_db
from app.models.branch import Branch
from app.models.user import User

async def seed_v2():
    print("--- STARTING V2 SEED ---")
    await init_db()
    
    # 1. Create Branches
    branches_data = [
        {"name": "Rancagua", "supports_grooming": True, "is_active": True},
        {"name": "Olivar", "supports_grooming": True, "is_active": True},
        {"name": "San Francisco de Mostazal", "supports_grooming": True, "is_active": True},
        {"name": "Viña del Mar", "supports_grooming": True, "is_active": True}, # Renamed from Sucursal 4
    ]
    
    for b_data in branches_data:
        exists = await Branch.find_one(Branch.name == b_data["name"])
        if not exists:
            b = Branch(**b_data)
            await b.insert()
            print(f"Created Branch: {b.name}")
        else:
            print(f"Branch exists: {b_data['name']}")

    # 2. Update Arlo User
    # Assuming email or name to find Arlo. Prompt says '"Arlo" (dueño)'.
    # We will search by name "Arlo" or email if known. 
    # Since I don't know the email, I'll upsert by Name "Arlo" for dev purposes, 
    # OR just print a warning to manually update if using real prod data.
    # However, for a seed, I should probably create a sample user "arlo@example.com" if not exists.
    
    arlo_email = "arlo@calfer.cl" # Hypothetical
    arlo = await User.find_one(User.email == arlo_email)
    
    if not arlo:
        # Create Dummy Arlo
        print(f"User {arlo_email} not found. Creating placeholder...")
        from app.core.security import get_password_hash
        arlo = User(
            name="Arlo", 
            email=arlo_email, 
            password_hash=get_password_hash("arlo123"), 
            roles=["admin", "vet", "sales"]
        )
        await arlo.insert()
        print("Created User Arlo with roles ['admin', 'vet', 'sales']")
    else:
        # Update roles
        if "sales" not in arlo.roles or "vet" not in arlo.roles:
            arlo.roles = list(set(arlo.roles + ["admin", "vet", "sales"]))
            await arlo.save()
            print("Updated Arlo roles.")

    # 3. Create Dummy Products & Services
    from app.models.product import Product
    from app.models.tutor import Tutor
    from app.models.stock import Stock
    from datetime import datetime

    products_data = [
        # Services
        {"name": "Consulta General", "kind": "SERVICE", "sale_price": 15000, "is_active": True},
        {"name": "Control Sano", "kind": "SERVICE", "sale_price": 10000, "is_active": True},
        {"name": "Vacuna Antirrábica", "kind": "SERVICE", "sale_price": 12000, "is_active": True},
        {"name": "Vacuna Óctuple", "kind": "SERVICE", "sale_price": 18000, "is_active": True},
        {"name": "Corte de Pelo Raza Pequeña", "kind": "SERVICE", "sale_price": 15000, "is_active": True},
        {"name": "Corte de Pelo Raza Grande", "kind": "SERVICE", "sale_price": 25000, "is_active": True},
        {"name": "Baño Sanitario", "kind": "SERVICE", "sale_price": 20000, "is_active": True},
        {"name": "Limpieza Dental", "kind": "SERVICE", "sale_price": 45000, "is_active": True},
        {"name": "Ecografía", "kind": "SERVICE", "sale_price": 30000, "is_active": True},
        
        # Products - Food
        {"name": "Royal Canin Puppy 3kg", "kind": "PRODUCT", "sale_price": 25000, "sku": "RC-PUP-3", "is_active": True},
        {"name": "Royal Canin Adult 15kg", "kind": "PRODUCT", "sale_price": 65000, "sku": "RC-ADU-15", "is_active": True},
        {"name": "Pro Plan Adulto 3kg", "kind": "PRODUCT", "sale_price": 24000, "sku": "PP-ADU-3", "is_active": True},
        {"name": "Dog Chow Adulto 21kg", "kind": "PRODUCT", "sale_price": 35000, "sku": "DC-ADU-21", "is_active": True},
        {"name": "Pellet Conejo 1kg", "kind": "PRODUCT", "sale_price": 4000, "sku": "PEL-CON-1", "is_active": True},

        # Products - Pharma
        {"name": "Pipeta Anti-Pulgas <10kg", "kind": "PRODUCT", "sale_price": 9990, "sku": "PIP-S", "is_active": True},
        {"name": "Pipeta Anti-Pulgas >10kg", "kind": "PRODUCT", "sale_price": 12990, "sku": "PIP-L", "is_active": True},
        {"name": "Antiparasitario Interno (Drontal)", "kind": "PRODUCT", "sale_price": 8000, "sku": "DRON-1", "is_active": True},
        {"name": "Meloxicam 10mg", "kind": "PRODUCT", "sale_price": 5000, "sku": "MEL-10", "is_active": True},
        {"name": "Omega 3 Aceite", "kind": "PRODUCT", "sale_price": 15000, "sku": "OMEG-3", "is_active": True},

        # Products - Accessories
        {"name": "Correa Retráctil", "kind": "PRODUCT", "sale_price": 12000, "sku": "COR-RET", "is_active": True},
        {"name": "Collar Nylon Rojo", "kind": "PRODUCT", "sale_price": 5000, "sku": "COL-NYL-R", "is_active": True},
        {"name": "Juguete Hueso Goma", "kind": "PRODUCT", "sale_price": 3500, "sku": "JUG-HUES", "is_active": True},
        {"name": "Cama Mediana", "kind": "PRODUCT", "sale_price": 25000, "sku": "CAM-M", "is_active": True},
    ]

    created_products = []
    for p_data in products_data:
        p = await Product.find_one(Product.name == p_data["name"])
        if not p:
            p = Product(**p_data, created_at=datetime.utcnow())
            await p.insert()
            print(f"Created Product: {p.name}")
        created_products.append(p)

    # 4. Create Dummy Stock for each Branch (100 units for products)
    all_branches = await Branch.find_all().to_list()
    for b in all_branches:
        for p in created_products:
            if p.kind == "PRODUCT":
                exists = await Stock.find_one(Stock.branch_id == b.id, Stock.product_id == p.id)
                if not exists:
                    s = Stock(branch_id=b.id, product_id=p.id, quantity=100, updated_at=datetime.utcnow())
                    await s.insert()
                    print(f"Added 100 stock of {p.name} to {b.name}")

    # 5. Create Dummy Tutor
    tutor_mail = "juan.perez@example.com"
    tutor = await Tutor.find_one(Tutor.email == tutor_mail)
    if not tutor:
        tutor = Tutor(
            full_name="Juan Perez",
            email=tutor_mail,
            phone="+56912345678",
            address="Calle Falsa 123",
            discount_percent=0.0
        )
        await tutor.insert()
        print(f"Created Tutor: {tutor.full_name}")

    print("--- V2 SEED COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(seed_v2())
