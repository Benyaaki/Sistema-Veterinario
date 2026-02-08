
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.database import init_db
from app.models.product import Product

async def run():
    await init_db()
    
    p1 = Product(name="Test 1", sale_price=10)
    p2 = Product(name="Test 2", sale_price=20)
    products = [p1, p2]
    
    print(f"Before insert: p1.id={p1.id}, p2.id={p2.id}")
    res = await Product.insert_many(products)
    print(f"After insert: p1.id={p1.id}, p2.id={p2.id}")
    print(f"Result type: {type(res)}")
    
    if hasattr(res, 'inserted_ids'):
        print(f"Inserted IDs: {res.inserted_ids}")

if __name__ == "__main__":
    asyncio.run(run())
