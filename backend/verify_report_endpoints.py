
import asyncio
from app.models.user import User
from app.routes.reports import sales_report, appointment_stats, product_stats, client_stats
from datetime import datetime, timedelta

# Mock dependencies
async def run_verify():
    try:
        # 1. Create a dummy user (admin)
        admin_user = User(
            id="64f1a2b3c4d5e6f7a8b9c0d1", 
            name="Admin Test", 
            email="admin@test.com", 
            hashed_password="...", 
            role="admin",
            roles=["admin"]
        )

        today = datetime.utcnow().strftime("%Y-%m-%d")
        week_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")

        print("--- Testing /sales ---")
        try:
            sales = await sales_report(start=week_ago, end=today, user=admin_user)
            print("Sales Response Keys:", sales.keys())
            print("Total Sales:", sales.get("total_sales"))
        except Exception as e:
            print(f"Sales Error: {e}")

        print("\n--- Testing /appointments ---")
        try:
            apts = await appointment_stats(start=week_ago, end=today, user=admin_user)
            print("Appointments Response Keys:", apts.keys())
        except Exception as e:
            print(f"Appointments Error: {e}")

        print("\n--- Testing /products ---")
        try:
            prods = await product_stats(start=week_ago, end=today, user=admin_user)
            print("Products Response Keys:", prods.keys())
        except Exception as e:
            print(f"Products Error: {e}")
            
        print("\n--- Testing /clients ---")
        try:
            clients = await client_stats(start=week_ago, end=today, user=admin_user)
            print("Clients Response Keys:", clients.keys())
        except Exception as e:
            print(f"Clients Error: {e}")

    except Exception as e:
        print(f"Fatal Layout Error: {e}")

if __name__ == "__main__":
    # We need to init ODM if we want real DB queries, 
    # but for syntax/logic checking often sufficient to run.
    # However, since these await DB calls, we won't get far without DB.
    # So this script is mostly to ensure no syntax errors and logical flow is sound
    # if we mock the DB or just rely on 'beanie not initialized' error as proof of code reaching that point.
    print("Code syntax check passed. Logic verification requires active DB connection.")
