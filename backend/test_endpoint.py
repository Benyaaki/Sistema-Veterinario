import requests
import json

# Test the dashboard endpoint
url = "http://localhost:8000/api/v1/reports/dashboard"
params = {
    "start_date": "2026-02-01T00:00:00.000Z",
    "end_date": "2026-02-01T23:59:59.000Z"
}

# Get a token first (you'll need to login)
# For now, let's just try without auth to see the error
try:
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
