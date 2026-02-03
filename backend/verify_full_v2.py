import os
import sys

# Manually load .env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

from fastapi.testclient import TestClient
from app.main import app
import logging
logging.basicConfig(level=logging.ERROR)

# Removing global client definition
# client = TestClient(app)

def run_tests():
    print("Starting Verification...")
    
    with TestClient(app) as client:
        # 0. Login Arlo
        print("0. Login...")
        res = client.post("/api/v1/auth/login", data={"username": "arlo@pattyvet.cl", "password": "arlo123"})
        if res.status_code != 200:
            print(f"Login Failed: {res.text}")
            return
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login OK.")

        # 1. Product & Inventory Init
        print("1. Testing Inventory Init...")
        prod_data = {"name": "Test Pipeta", "sale_price": 5000, "kind": "PRODUCT"}
        res = client.post("/api/v1/products/", json=prod_data, headers=headers)
        if res.status_code != 200:
            print(f"Create Product Failed: {res.text}")
            return
        prod_id = res.json()["_id"]
        
        # Check Stock created for 4 branches
        res = client.get(f"/api/v1/inventory/stock?product_id={prod_id}", headers=headers)
        stocks = res.json()
        if len(stocks) != 4:
             print(f"Stock Init Failed: Expected 4, got {len(stocks)}")
             return
        print("Stock Init OK (4 branches).")

        branch_id = stocks[0]["branch_id"]

        # 2. Movement IN
        print("2. Testing Stock Movement IN...")
        mov_data = {"type": "IN", "product_id": prod_id, "quantity": 10, "to_branch_id": branch_id, "reason": "Init"}
        res = client.post("/api/v1/inventory/movements", json=mov_data, headers=headers)
        if res.status_code != 200:
            print(f"Mov IN Failed: {res.text}")
            return
        
        # Verify Quantity
        res = client.get(f"/api/v1/inventory/stock?branch_id={branch_id}&product_id={prod_id}", headers=headers)
        qty = res.json()[0]["quantity"]
        if qty != 10:
            print(f"Mov IN Failed: Expected 10, got {qty}")
            return
        print("Stock IN OK.")

        # 3. Create Sale
        print("3. Testing Sale & Stock Deduction...")
        sale_data = {
            "branch_id": branch_id,
            "items": [{
                "product_id": prod_id,
                "name": "Test Pipeta",
                "type": "PRODUCT",
                "quantity": 2,
                "unit_price": 5000,
                "total": 10000
            }],
            "subtotal": 10000,
            "discount_percent": 0,
            "discount_amount": 0,
            "total": 10000,
            "payment_method": "CASH",
            "cash_received": 12000,
            "cash_change": 2000
        }
        res = client.post("/api/v1/sales/", json=sale_data, headers=headers)
        if res.status_code != 200:
            print(f"Create Sale Failed: {res.text}")
            return
        sale_id = res.json()["_id"]
        
        # Check Stock (10 - 2 = 8)
        res = client.get(f"/api/v1/inventory/stock?branch_id={branch_id}&product_id={prod_id}", headers=headers)
        qty = res.json()[0]["quantity"]
        if qty != 8:
            print(f"Stock Deduction Failed: Expected 8, got {qty}")
            return
        print("Sale & Deduction OK.")

        # 4. Void Sale
        print("4. Testing Void Sale...")
        res = client.post(f"/api/v1/sales/{sale_id}/void", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "VOIDED"
        
        # Check Reversion (8 + 2 = 10)
        res = client.get(f"/api/v1/inventory/stock?branch_id={branch_id}&product_id={prod_id}", headers=headers)
        qty = res.json()[0]["quantity"]
        if qty != 10:
            print(f"Stock Reversion Failed: Expected 10, got {qty}")
            return
        print("Void Reversion OK.")

        # 5. Grooming Rules
        print("5. Testing Grooming Rules...")
        # Create Tutor
        res = client.post("/api/v1/tutors/", json={"full_name": "Groom Tutor", "phone": "111"}, headers=headers)
        if res.status_code not in [200, 201]:
             print(f"Create Tutor Failed: {res.text}")
             return
        tutor_id = res.json().get("_id") or res.json().get("id")

        # Create Patient
        res = client.post("/api/v1/patients/", json={"name": "Fluffy", "species": "Canino", "breed": "Poodle", "sex": "M", "color": "White", "birth_date": "2020-01-01", "tutor_id": tutor_id}, headers=headers)
        if res.status_code not in [200, 201]:
             print(f"Create Patient Failed: {res.text}")
             return
        pat_id = res.json().get("_id") or res.json().get("id")
        
        # Create Grooming Appt
        appt_data = {
            "patient_id": pat_id, 
            "reason": "Grooming", 
            "date": "2026-02-01T10:00:00",
            "appointment_type": "GROOMING",
            "branch_id": branch_id
        }
        res = client.post("/api/v1/consultations/", json=appt_data, headers=headers)
        if res.status_code not in [200, 201]:
             print(f"Create Appt Failed: {res.text}")
             return
        appt_id = res.json().get("id") or res.json().get("_id")

        # Fail Case: Attended without Sale
        res = client.put(f"/api/v1/consultations/{appt_id}", json={"status": "attended"}, headers=headers)
        if res.status_code == 400:
            print("Success: Blocked finishing Grooming without sale.")
        else:
            print(f"Failed: Should have blocked Grooming w/o sale. Code: {res.status_code}")
            return

        # Success Case: With Sale ID
        res = client.put(f"/api/v1/consultations/{appt_id}", json={"status": "attended", "reference_sale_id": sale_id}, headers=headers)
        if res.status_code == 200:
            print("Success: Finished Grooming with sale.")
        else:
            print(f"Failed to finish Grooming with sale: {res.text}")
            return

        print("--- BACKEND VERIFIED SUCCESSFULLY ---")

if __name__ == "__main__":
    run_tests()

