import os
import json
from datetime import datetime, timezone
import motor.motor_asyncio
from app.core.config import settings
from beanie import Document
import asyncio

BACKUP_DIR = os.path.join(os.getcwd(), "backups")

async def perform_backup():
    """
    Performs a logical backup of all collections in the configured MongoDB database.
    Saves each collection as a JSON file in a timestamped folder.
    """
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    current_backup_path = os.path.join(BACKUP_DIR, f"backup_{timestamp}")
    os.makedirs(current_backup_path)

    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    
    collections = await db.list_collection_names()
    
    status = {
        "timestamp": timestamp,
        "collections": [],
        "success": True,
        "error": None
    }

    try:
        for coll_name in collections:
            cursor = db[coll_name].find()
            docs = await cursor.to_list(length=None)
            
            # Serialize for JSON (handling ObjectIds and Datetimes)
            def serialize(obj):
                if isinstance(obj, (datetime)):
                    return obj.isoformat()
                if hasattr(obj, "__str__") and "ObjectId" in str(type(obj)):
                    return str(obj)
                return obj

            file_path = os.path.join(current_backup_path, f"{coll_name}.json")
            with open(file_path, "w", encoding="utf-8") as f:
                # We use a custom encoder or simple mapping
                # For basic logic:
                json_docs = []
                for d in docs:
                    # Deep copy and convert
                    d_str = json.loads(json.dumps(d, default=serialize))
                    json_docs.append(d_str)
                
                json.dump(json_docs, f, indent=2, ensure_ascii=False)
            
            status["collections"].append({
                "name": coll_name,
                "count": len(docs),
                "size_kb": os.path.getsize(file_path) / 1024
            })

    except Exception as e:
        status["success"] = False
        status["error"] = str(e)
        from app.services.activity_service import log_activity
        # We need a system user or dummy user for system logs
        # For now we'll just print or use log_activity with None if supported
        print(f"BACKUP ERROR: {e}")

    # Save metatada
    with open(os.path.join(current_backup_path, "metadata.json"), "w") as f:
        json.dump(status, f, indent=2)

    # Log Success to activity (if success)
    if status["success"]:
        # Optional: cleanup old backups (retention policy: 7 days)
        await cleanup_old_backups(7)

    return status

async def cleanup_old_backups(days_retention: int):
    # Logic to delete folders older than N days
    pass

async def get_latest_backup_status():
    if not os.path.exists(BACKUP_DIR):
        return None
    
    backups = [d for d in os.listdir(BACKUP_DIR) if os.path.isdir(os.path.join(BACKUP_DIR, d))]
    if not backups:
        return None
    
    latest = sorted(backups, reverse=True)[0]
    meta_path = os.path.join(BACKUP_DIR, latest, "metadata.json")
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            return json.load(f)
    return {"timestamp": latest, "status": "Incompleto"}
