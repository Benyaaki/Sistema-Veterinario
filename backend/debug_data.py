
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
from app.models.sale import Sale
from app.models.tutor import Tutor
from app.core.config import settings

async def main():
    print("--- DEBUG DATA START ---")
    try:
        # Connect to DB using settings
        print(f"Connecting to: {settings.MONGODB_URI} (DB: {settings.DB_NAME})")
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        await init_beanie(database=client[settings.DB_NAME], document_models=[Sale, Tutor])
        
        # 1. Fetch recent sales with debt
        sales = await Sale.find(Sale.payment_method == "DEBT").sort("-created_at").limit(5).to_list()
        print(f"Found {len(sales)} DEBT sales")
        
        for s in sales:
            print(f"SALE ID: {s.id}")
            print(f"  Customer ID (Raw): {s.customer_id} (Type: {type(s.customer_id)})")
            
            if s.customer_id:
                # Try to find tutor
                tutor = await Tutor.get(s.customer_id)
                if tutor:
                    print(f"  -> FOUND TUTOR: {tutor.id} - {tutor.full_name}")
                else:
                    print(f"  -> TUTOR NOT FOUND for ID: {s.customer_id}")
                    # Try to find string match manually
                    print("  -> Attempting string search for ID...")
                    all_tutors = await Tutor.find_all().to_list()
                    found = False
                    for t in all_tutors:
                        if str(t.id) == str(s.customer_id):
                            print(f"     MATCH FOUND via string comparison: {t.full_name} (ID: {t.id})")
                            found = True
                            break
                    if not found:
                        print("     No string match found either.")
                        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
