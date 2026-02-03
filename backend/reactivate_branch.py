import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.core.database import init_db
from app.models.branch import Branch

async def main():
    await init_db()
    
    branch_name = "Viña del Mar"
    branch = await Branch.find_one(Branch.name == branch_name)
    
    if not branch:
        print(f"Sucursal '{branch_name}' no encontrada.")
        return

    branch.is_active = True
    await branch.save()
    print(f"Sucursal '{branch_name}' reactivada correctamente.")

if __name__ == "__main__":
    asyncio.run(main())
