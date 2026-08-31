from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class AlertOut(BaseModel):
    item_id: UUID
    sku: str
    name: str
    category_name: Optional[str] = None
    unit_of_measure: str
    reorder_level: int
    on_hand: int
    deficit: int
    is_dismissed: bool
    dismissed_at: Optional[datetime] = None
    dismissed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class AlertCountOut(BaseModel):
    count: int
