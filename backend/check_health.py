import requests
try:
    print("Checking backend health...")
    r = requests.get('http://localhost:8000/api/v1/')
    print(r.status_code)
    print(r.json())
except Exception as e:
    print(f"Error: {e}")
