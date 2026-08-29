from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.auth import UserOut


class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class LocationOut(LocationBase):
    id: UUID
    created_at: datetime
    staff_count: Optional[int] = 0
    movement_count: Optional[int] = 0

    class Config:
        from_attributes = True


class LocationStaffAssignment(BaseModel):
    staff_user_ids: List[UUID]
