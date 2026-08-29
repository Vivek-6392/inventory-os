from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    StockMovement,
    MovementKind,
    Item,
    Location,
    User,
    UserRole,
    AlertState,
)
from app.schemas.movement import MovementCreate
from app.services.stock_service import get_item_stock_at_location, get_item_total_on_hand


def record_stock_movement(
    db: Session,
    payload: MovementCreate,
    current_user: User,
) -> StockMovement:
    """
    Goal 3: Record stock movement (receipt, issue, transfer, adjustment).
    Goal 4: Enforce append-only ledger rules, negative stock prevention, and adjustment reason.
    Goal 5: Enforce location assignment permissions for staff.
    Goal 10: Update write-time alert state if stock rises above reorder level.
    """
    # 1. Validate Item
    item = db.query(Item).filter(Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    if item.archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record stock movements against an archived item. Restore the item first.",
        )

    # 2. Validate Role Permissions (Staff vs Manager)
    if current_user.role == UserRole.STAFF:
        if payload.kind == MovementKind.ADJUSTMENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff members cannot record stock adjustments. Only managers can make adjustments.",
            )

        assigned_loc_ids = {loc.id for loc in current_user.assigned_locations}

        # Check location assignment
        if payload.kind in (MovementKind.RECEIPT, MovementKind.ISSUE):
            if not payload.location_id or payload.location_id not in assigned_loc_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to record movements at this location.",
                )
        elif payload.kind == MovementKind.TRANSFER:
            if not payload.from_location_id or payload.from_location_id not in assigned_loc_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to initiate transfers from this source location.",
                )

    # 3. Validate Movement Details based on Kind
    movement = StockMovement(
        item_id=item.id,
        kind=payload.kind,
        quantity=payload.quantity,
        recorded_by=current_user.id,
        reason=payload.reason.strip() if payload.reason else None,
    )

    if payload.kind == MovementKind.RECEIPT:
        if payload.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Receipt quantity must be greater than 0",
            )
        if not payload.location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location is required for stock receipts",
            )
        loc = db.query(Location).filter(Location.id == payload.location_id).first()
        if not loc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )
        movement.location_id = payload.location_id

    elif payload.kind == MovementKind.ISSUE:
        if payload.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Issue quantity must be greater than 0",
            )
        if not payload.location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location is required for stock issues",
            )
        loc = db.query(Location).filter(Location.id == payload.location_id).first()
        if not loc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )

        # Ledger rule: cannot drive location negative
        current_stock = get_item_stock_at_location(db, item.id, payload.location_id)
        if current_stock < payload.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock at {loc.name}: currently have {current_stock} {item.unit_of_measure}, attempted to issue {payload.quantity} {item.unit_of_measure}.",
            )
        movement.location_id = payload.location_id

    elif payload.kind == MovementKind.TRANSFER:
        if payload.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transfer quantity must be greater than 0",
            )
        if not payload.from_location_id or not payload.to_location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both source (from) and destination (to) locations are required for a transfer",
            )
        if payload.from_location_id == payload.to_location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source and destination locations must be different",
            )

        from_loc = db.query(Location).filter(Location.id == payload.from_location_id).first()
        to_loc = db.query(Location).filter(Location.id == payload.to_location_id).first()
        if not from_loc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source location not found",
            )
        if not to_loc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Destination location not found",
            )

        # Ledger rule: cannot drive source location negative
        source_stock = get_item_stock_at_location(db, item.id, payload.from_location_id)
        if source_stock < payload.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transfer: insufficient stock at {from_loc.name} (currently have {source_stock} {item.unit_of_measure}, requested {payload.quantity} {item.unit_of_measure}).",
            )

        movement.from_location_id = payload.from_location_id
        movement.to_location_id = payload.to_location_id

    elif payload.kind == MovementKind.ADJUSTMENT:
        if payload.quantity == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Adjustment quantity cannot be 0",
            )
        if not payload.location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location is required for stock adjustments",
            )
        if not payload.reason or not payload.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A detailed reason is strictly required for stock adjustments",
            )

        loc = db.query(Location).filter(Location.id == payload.location_id).first()
        if not loc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )

        # If reducing stock via adjustment, cannot drive negative
        if payload.quantity < 0:
            current_stock = get_item_stock_at_location(db, item.id, payload.location_id)
            if current_stock + payload.quantity < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot reduce stock below 0 at {loc.name} (currently have {current_stock} {item.unit_of_measure}, requested adjustment of {payload.quantity}).",
                )

        movement.location_id = payload.location_id

    # 4. Save movement to append-only ledger
    db.add(movement)
    db.flush()

    # 5. Goal 10 write-time alert state trigger:
    # If total on-hand rises above reorder level, reset is_dismissed = False
    total_on_hand = get_item_total_on_hand(db, item.id)
    alert_state = db.query(AlertState).filter(AlertState.item_id == item.id).first()
    if not alert_state:
        alert_state = AlertState(item_id=item.id, is_dismissed=False)
        db.add(alert_state)
    elif total_on_hand > item.reorder_level:
        alert_state.is_dismissed = False
        alert_state.dismissed_at = None
        alert_state.dismissed_by = None

    db.commit()
    db.refresh(movement)
    return movement
