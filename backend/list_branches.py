import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.core.database import init_db
from app.models.branch import Branch

async def main():
    await init_db()
    
    branches = await Branch.find_all().to_list()
    print("--- Listado de Sucursales ---")
    for b in branches:
        print(f"ID: {b.id} | Name: '{b.name}' | Active: {b.is_active}")
    print("-----------------------------")

if __name__ == "__main__":
    asyncio.run(main())
