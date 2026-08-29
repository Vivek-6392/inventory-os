from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.category import CategoryOut


class ItemBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    unit_of_measure: str = Field(..., min_length=1, max_length=50)
    reorder_level: int = Field(default=0, ge=0)
    category_id: Optional[UUID] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    unit_of_measure: Optional[str] = Field(None, min_length=1, max_length=50)
    reorder_level: Optional[int] = Field(None, ge=0)
    category_id: Optional[UUID] = None


class ItemOut(ItemBase):
    id: UUID
    archived: bool
    created_at: datetime
    category: Optional[CategoryOut] = None
    on_hand: int = 0
    stock_by_location: Optional[Dict[str, int]] = None

    class Config:
        from_attributes = True


class PaginatedItemsResponse(BaseModel):
    items: List[ItemOut]
    total: int
    page: int
    limit: int
    pages: int
