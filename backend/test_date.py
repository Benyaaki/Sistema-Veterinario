import asyncio
from datetime import datetime

# Test the ISO parsing
test_date = "2026-02-01T00:00:00.000Z"
print(f"Original: {test_date}")

try:
    # Method 1: Replace Z
    dt1 = datetime.fromisoformat(test_date.replace('Z', '+00:00'))
    print(f"Method 1 (replace Z): {dt1}")
except Exception as e:
    print(f"Method 1 failed: {e}")

try:
    # Method 2: Use strptime
    dt2 = datetime.strptime(test_date, "%Y-%m-%dT%H:%M:%S.%fZ")
    print(f"Method 2 (strptime): {dt2}")
except Exception as e:
    print(f"Method 2 failed: {e}")
