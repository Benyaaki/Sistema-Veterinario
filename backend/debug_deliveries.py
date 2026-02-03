import asyncio
from app.models.delivery import DeliveryOrder
from app.models.sale import Sale
from app.routes.deliveries import get_deliveries
from app.models.user import User
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Mock DB connection
async def test_get_deliveries():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(database=client.veterinaria, document_models=[DeliveryOrder, Sale, User])
    
    # Create a mock user for auth
    mock_user = User(id="507f1f77bcf86cd799439011", email="test@test.com", roles=["admin"]) 
    
    # Fetch
    # Note: get_deliveries is an async route function. We can call it directly if we mock dependencies or just run the logic.
    # But simpler: just query DB and run the logic manually to see if it works.
    
    deliveries = await DeliveryOrder.find_all().to_list()
    print(f"Found {len(deliveries)} deliveries")
    
    for d in deliveries:
        print(f"Delivery {d.id} Sale {d.sale_id}")
        sale = await Sale.get(d.sale_id)
        print(f"Sale found: {sale is not None}")
        if sale:
            print(f"Sale Total: {sale.total}")
            
    # Test dictionary logic
    results = []
    for d in deliveries:
        d_dict = d.dict()
        if d.sale_id:
            sale = await Sale.get(d.sale_id)
            if sale:
                d_dict['sale_details'] = sale.dict()
                print(f"Added sale details. Total in dict: {d_dict['sale_details'].get('total')}")
            else:
                print("Sale not found for delivery")
        results.append(d_dict)

if __name__ == "__main__":
    asyncio.run(test_get_deliveries())
