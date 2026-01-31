import asyncio
from app.core.database import init_db
from app.models.file_record import FileRecord
from app.core.config import settings
import os

async def main():
    await init_db()
    files = await FileRecord.find_all().to_list()
    print(f"Total entries in DB: {len(files)}")
    
    upload_dir = settings.UPLOAD_DIR
    print(f"Upload Dir: {upload_dir}")
    
    if os.path.exists(upload_dir):
        on_disk = os.listdir(upload_dir)
        print(f"Files on disk: {len(on_disk)}")
        print(f"Disk files: {on_disk}")
    else:
        print("Upload dir does not exist!")
        on_disk = []

    for f in files:
        file_path = os.path.join(upload_dir, f.path)
        exists = os.path.exists(file_path)
        print(f"ID: {f.id} | Name: {f.original_name} | Mime: {f.mime_type} | Exists: {exists}")

if __name__ == "__main__":
    asyncio.run(main())
