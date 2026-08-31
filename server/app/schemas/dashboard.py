from datetime import datetime, date
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class CategoryStockDistribution(BaseModel):
    category_id: Optional[UUID] = None
    category_name: str
    item_count: int
    total_stock: int


class LocationStockDistribution(BaseModel):
    location_id: UUID
    location_name: str
    total_stock: int
    movement_count: int


class LowStockItemSummary(BaseModel):
    item_id: UUID
    sku: str
    name: str
    category_name: Optional[str] = None
    unit_of_measure: str
    reorder_level: int
    on_hand: int
    deficit: int


class RecentMovementSummary(BaseModel):
    id: UUID
    item_name: str
    item_sku: str
    kind: str
    quantity: int
    location_name: Optional[str] = None
    from_location_name: Optional[str] = None
    to_location_name: Optional[str] = None
    reason: Optional[str] = None
    user_name: str
    created_at: datetime


class MovementTrendDay(BaseModel):
    date: str
    receipts: int
    issues: int
    transfers: int
    adjustments: int


class DashboardStatsOut(BaseModel):
    total_items: int
    archived_items: int
    total_stock_units: int
    low_stock_count: int
    total_locations: int
    total_movements: int
    category_distribution: List[CategoryStockDistribution]
    location_distribution: List[LocationStockDistribution]
    low_stock_items: List[LowStockItemSummary]
    recent_movements: List[RecentMovementSummary]
    movement_trends: List[MovementTrendDay]
