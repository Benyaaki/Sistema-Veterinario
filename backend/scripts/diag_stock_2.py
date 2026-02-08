
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
    await init_db()
    
    branches = await Branch.find_all().to_list()
    print(f"Total branches: {len(branches)}")
    for b in branches:
        print(f"Branch: {b.name} ({b.id})")
        
    print("\nCheck stock for 'Doguitos Medallones de Carne 65 g':")
    p = await Product.find_one(Product.name == "Doguitos Medallones de Carne 65 g")
    if p:
        print(f"Product ID: {p.id}")
        stocks = await Stock.find(Stock.product_id == p.id).to_list()
        if not stocks:
            print("  No stock records found for this product.")
        for s in stocks:
            b = next((branch for branch in branches if branch.id == s.branch_id), None)
            print(f"  - {b.name if b else s.branch_id}: {s.quantity}")
    else:
        print("Product not found.")

if __name__ == "__main__":
    asyncio.run(run())
