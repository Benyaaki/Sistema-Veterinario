
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.database import init_db
from app.models.product import Product
from app.models.stock import Stock
from app.models.branch import Branch

async def run():
    print("Initializating DB...")
    await init_db()
    
    print("\n--- BRANCHES ---")
    branches = await Branch.find_all().to_list()
    for b in branches:
        print(f"ID: {b.id} | Name: '{b.name}'")
        
    print("\n--- RECENT PRODUCTS ---")
    products = await Product.find().sort("-id").limit(5).to_list()
    for p in products:
        print(f"Product: {p.name} (ID: {p.id})")
        stocks = await Stock.find(Stock.product_id == p.id).to_list()
        for s in stocks:
            branch = next((b for b in branches if b.id == s.branch_id), None)
            bname = branch.name if branch else "Unknown"
            print(f"  Branch: {bname} | Qty: {s.quantity}")

if __name__ == "__main__":
    asyncio.run(run())
