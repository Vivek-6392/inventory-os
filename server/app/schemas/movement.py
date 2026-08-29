from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.models import MovementKind
from app.schemas.auth import UserOut


class LocationSummary(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class ItemSummary(BaseModel):
    id: UUID
    sku: str
    name: str
    unit_of_measure: str

    class Config:
        from_attributes = True


class MovementCreate(BaseModel):
    item_id: UUID
    kind: MovementKind
    quantity: int = Field(..., description="Positive integer for receipt/issue/transfer; non-zero for adjustment")
    location_id: Optional[UUID] = Field(None, description="Target location for receipt, issue, or adjustment")
    from_location_id: Optional[UUID] = Field(None, description="Source location for transfer")
    to_location_id: Optional[UUID] = Field(None, description="Destination location for transfer")
    reason: Optional[str] = Field(None, description="Required for adjustments; optional for others")


class MovementOut(BaseModel):
    id: UUID
    item_id: UUID
    kind: MovementKind
    quantity: int
    location_id: Optional[UUID] = None
    from_location_id: Optional[UUID] = None
    to_location_id: Optional[UUID] = None
    reason: Optional[str] = None
    recorded_by: UUID
    created_at: datetime
    item: Optional[ItemSummary] = None
    recorder: Optional[UserOut] = None
    location: Optional[LocationSummary] = None
    from_location: Optional[LocationSummary] = None
    to_location: Optional[LocationSummary] = None

    class Config:
        from_attributes = True


class PaginatedMovementsResponse(BaseModel):
    items: List[MovementOut]
    total: int
    page: int
    limit: int
    pages: int
