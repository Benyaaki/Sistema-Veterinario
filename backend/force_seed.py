import os
import asyncio
import sys

# Manually load .env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
print(f"Loading env from {env_path}")

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()
else:
    print(".env not found!")

# Now import app
sys.path.append(os.path.join(os.path.dirname(__file__)))
from seed_v2 import seed_v2

if __name__ == "__main__":
    asyncio.run(seed_v2())
