from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.auth import UserOut


class NoteCreate(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)


class ItemHistoryOut(BaseModel):
    id: UUID
    item_id: UUID
    action: str  # CREATED, FIELD_UPDATED, ARCHIVED, RESTORED, NOTE
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: Optional[str] = None
    changed_by: UUID
    created_at: datetime
    changed_by_user: Optional[UserOut] = None

    class Config:
        from_attributes = True
