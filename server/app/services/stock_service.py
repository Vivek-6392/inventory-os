from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_

from app.models.models import StockMovement, MovementKind, Location, Item


def get_total_on_hand_subquery():
    """
    Returns a SQLAlchemy selectable expression for total on-hand quantity per item across all locations.
    Transfers have a net 0 effect across the company.
    """
    net_qty = case(
        (StockMovement.kind == MovementKind.RECEIPT, StockMovement.quantity),
        (StockMovement.kind == MovementKind.ISSUE, -StockMovement.quantity),
        (StockMovement.kind == MovementKind.ADJUSTMENT, StockMovement.quantity),
        else_=0,
    )
    return (
        func.coalesce(func.sum(net_qty), 0)
    )


def get_item_total_on_hand(db: Session, item_id: UUID) -> int:
    """Compute total on-hand quantity across all locations for a single item."""
    net_qty = case(
        (StockMovement.kind == MovementKind.RECEIPT, StockMovement.quantity),
        (StockMovement.kind == MovementKind.ISSUE, -StockMovement.quantity),
        (StockMovement.kind == MovementKind.ADJUSTMENT, StockMovement.quantity),
        else_=0,
    )
    result = (
        db.query(func.coalesce(func.sum(net_qty), 0))
        .filter(StockMovement.item_id == item_id)
        .scalar()
    )
    return int(result or 0)


def get_item_stock_at_location(db: Session, item_id: UUID, location_id: UUID) -> int:
    """Compute on-hand quantity for an item at a specific location."""
    net_qty = case(
        (
            and_(
                StockMovement.location_id == location_id,
                StockMovement.kind == MovementKind.RECEIPT,
            ),
            StockMovement.quantity,
        ),
        (
            and_(
                StockMovement.location_id == location_id,
                StockMovement.kind == MovementKind.ISSUE,
            ),
            -StockMovement.quantity,
        ),
        (
            and_(
                StockMovement.location_id == location_id,
                StockMovement.kind == MovementKind.ADJUSTMENT,
            ),
            StockMovement.quantity,
        ),
        (
            and_(
                StockMovement.to_location_id == location_id,
                StockMovement.kind == MovementKind.TRANSFER,
            ),
            StockMovement.quantity,
        ),
        (
            and_(
                StockMovement.from_location_id == location_id,
                StockMovement.kind == MovementKind.TRANSFER,
            ),
            -StockMovement.quantity,
        ),
        else_=0,
    )
    result = (
        db.query(func.coalesce(func.sum(net_qty), 0))
        .filter(StockMovement.item_id == item_id)
        .scalar()
    )
    return int(result or 0)


def get_item_stock_by_location(db: Session, item_id: UUID) -> Dict[str, int]:
    """Compute on-hand quantity for an item grouped by each location."""
    locations = db.query(Location).all()
    breakdown = {}
    for loc in locations:
        qty = get_item_stock_at_location(db, item_id, loc.id)
        breakdown[str(loc.id)] = qty
    return breakdown


def get_multiple_items_stock(db: Session, item_ids: List[UUID]) -> Dict[UUID, int]:
    """Batch compute total on-hand stock for a list of items."""
    if not item_ids:
        return {}

    net_qty = case(
        (StockMovement.kind == MovementKind.RECEIPT, StockMovement.quantity),
        (StockMovement.kind == MovementKind.ISSUE, -StockMovement.quantity),
        (StockMovement.kind == MovementKind.ADJUSTMENT, StockMovement.quantity),
        else_=0,
    )
    results = (
        db.query(
            StockMovement.item_id,
            func.coalesce(func.sum(net_qty), 0).label("on_hand"),
        )
        .filter(StockMovement.item_id.in_(item_ids))
        .group_by(StockMovement.item_id)
        .all()
    )
    stock_map = {item_id: 0 for item_id in item_ids}
    for row in results:
        stock_map[row.item_id] = int(row.on_hand or 0)
    return stock_map


def get_all_items_stock_summary(db: Session) -> List[Dict]:
    """
    Returns full stock position across all items and locations for reporting and export.
    """
    items = db.query(Item).order_by(Item.name.asc()).all()
    locations = db.query(Location).all()
    if not items:
        return []

    item_ids = [item.id for item in items]
    total_stock_map = get_multiple_items_stock(db, item_ids)

    summary = []
    for item in items:
        loc_map = {}
        for loc in locations:
            qty = get_item_stock_at_location(db, item.id, loc.id)
            loc_map[loc.id] = qty

        summary.append({
            "item": item,
            "on_hand": total_stock_map.get(item.id, 0),
            "stock_by_location": loc_map,
        })
    return summary

