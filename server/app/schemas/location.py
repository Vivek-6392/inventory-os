from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.auth import UserOut


class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = "Warehouse"
    is_active: Optional[bool] = True
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class StaffBrief(BaseModel):
    id: UUID
    name: str
    email: str

    class Config:
        from_attributes = True


class LocationOut(LocationBase):
    id: UUID
    created_at: datetime
    staff_count: Optional[int] = 0
    movement_count: Optional[int] = 0
    total_stock: Optional[int] = 0
    assigned_staff: Optional[List[StaffBrief]] = []

    class Config:
        from_attributes = True


class LocationStaffAssignment(BaseModel):
    staff_user_ids: List[UUID]
