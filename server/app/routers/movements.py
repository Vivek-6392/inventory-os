import math
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.models.models import StockMovement, MovementKind, User, Item
from app.schemas.movement import MovementCreate, MovementOut, PaginatedMovementsResponse
from app.services.movement_service import record_stock_movement
from app.middleware.auth import require_any

router = APIRouter(prefix="/api/movements", tags=["movements"])


@router.post("", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def create_movement(
    payload: MovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 3 & 4: Record a stock movement (Receipt, Issue, Transfer, Adjustment)
    into the append-only ledger.
    """
    movement = record_stock_movement(db, payload, current_user)

    # Reload with joined relationships for response
    loaded = (
        db.query(StockMovement)
        .options(
            joinedload(StockMovement.item),
            joinedload(StockMovement.recorder),
            joinedload(StockMovement.location),
            joinedload(StockMovement.from_location),
            joinedload(StockMovement.to_location),
        )
        .filter(StockMovement.id == movement.id)
        .first()
    )
    return loaded


@router.get("", response_model=PaginatedMovementsResponse)
def list_movements(
    item_id: Optional[UUID] = Query(None, description="Filter by item ID"),
    location_id: Optional[UUID] = Query(None, description="Filter by location ID (any involvement)"),
    kind: Optional[MovementKind] = Query(None, description="Filter by movement kind"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 4: Query the append-only stock ledger in reverse chronological order.
    """
    query = (
        db.query(StockMovement)
        .options(
            joinedload(StockMovement.item),
            joinedload(StockMovement.recorder),
            joinedload(StockMovement.location),
            joinedload(StockMovement.from_location),
            joinedload(StockMovement.to_location),
        )
    )

    if item_id:
        query = query.filter(StockMovement.item_id == item_id)

    if location_id:
        query = query.filter(
            or_(
                StockMovement.location_id == location_id,
                StockMovement.from_location_id == location_id,
                StockMovement.to_location_id == location_id,
            )
        )

    if kind:
        query = query.filter(StockMovement.kind == kind)

    total = query.count()
    offset = (page - 1) * limit
    items = (
        query.order_by(StockMovement.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    pages = math.ceil(total / limit) if total > 0 else 1

    return PaginatedMovementsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/item/{item_id}", response_model=List[MovementOut])
def get_item_movements(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 3: Opening an item shows its full movement history in order.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    movements = (
        db.query(StockMovement)
        .options(
            joinedload(StockMovement.recorder),
            joinedload(StockMovement.location),
            joinedload(StockMovement.from_location),
            joinedload(StockMovement.to_location),
        )
        .filter(StockMovement.item_id == item_id)
        .order_by(StockMovement.created_at.desc())
        .all()
    )
    return movements
