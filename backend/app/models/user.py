from beanie import Document, before_event, Replace, Insert, Save, SaveChanges, PydanticObjectId
from datetime import datetime
from typing import Optional, List
from pydantic import Field

class User(Document):
    name: str = "Admin"
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    role: str = "admin"
    roles: List[str] = []
    branch_id: Optional[PydanticObjectId] = None  # Branch assignment for non-admin users
    signature_file_id: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None
    permissions: List[str] = []

    class Settings:
        name = "users"

    @before_event(Insert, Replace, Save, SaveChanges)
    def sync_roles(self):
        # Ensure compatibility
        if self.role and self.role not in self.roles:
            self.roles.append(self.role)
        # Verify if roles contains admin to sync back to role (for old checks)
        if "admin" in self.roles or "superadmin" in self.roles:
             self.role = "admin"

