from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AlertState, Item, User, UserRole
from app.schemas.alert import AlertOut, AlertCountOut
from app.middleware.auth import require_any, require_manager
from app.services.stock_service import get_item_total_on_hand, get_multiple_items_stock

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _build_alert_list(db: Session, include_dismissed: bool = False) -> List[AlertOut]:
    """
    Build alert list: all non-archived items where on_hand <= reorder_level
    and (is_dismissed = False, or include_dismissed=True).
    """
    items = db.query(Item).filter(Item.archived == False).all()
    if not items:
        return []

    item_ids = [item.id for item in items]
    stock_map = get_multiple_items_stock(db, item_ids)

    alerts = []
    for item in items:
        on_hand = stock_map.get(item.id, 0)
        if on_hand > item.reorder_level:
            continue  # stock is fine, skip

        state = db.query(AlertState).filter(AlertState.item_id == item.id).first()
        is_dismissed = state.is_dismissed if state else False

        if not include_dismissed and is_dismissed:
            continue  # skip dismissed alerts in default view

        dismissed_by_name = None
        dismissed_at = None
        if state and state.is_dismissed:
            dismissed_at = state.dismissed_at
            if state.dismissed_by_user:
                dismissed_by_name = state.dismissed_by_user.name

        alerts.append(
            AlertOut(
                item_id=item.id,
                sku=item.sku,
                name=item.name,
                category_name=item.category.name if item.category else None,
                unit_of_measure=item.unit_of_measure,
                reorder_level=item.reorder_level,
                on_hand=on_hand,
                deficit=max(0, item.reorder_level - on_hand),
                is_dismissed=is_dismissed,
                dismissed_at=dismissed_at,
                dismissed_by_name=dismissed_by_name,
            )
        )

    # Sort: non-dismissed first, then by deficit desc
    alerts.sort(key=lambda a: (a.is_dismissed, -a.deficit))
    return alerts


@router.get("/count", response_model=AlertCountOut)
def get_alert_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 5: Return count of active (non-dismissed) low-stock alerts.
    Used by the Layout badge to show real-time alert indicator.
    """
    alerts = _build_alert_list(db, include_dismissed=False)
    return AlertCountOut(count=len(alerts))


@router.get("", response_model=List[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 5: List all active (non-dismissed) low-stock alerts.
    Returns items where on_hand <= reorder_level and is_dismissed = False.
    """
    return _build_alert_list(db, include_dismissed=False)


@router.get("/all", response_model=List[AlertOut])
def list_all_alerts_including_dismissed(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Manager view: list all low-stock items including dismissed ones.
    Useful for reviewing dismissed alerts that haven't been restocked.
    """
    return _build_alert_list(db, include_dismissed=True)


@router.post("/{item_id}/dismiss", response_model=AlertOut)
def dismiss_alert(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 5: Manager dismisses a low-stock alert for an item.
    Sets is_dismissed = True. The alert will auto-re-trigger when stock
    rises above reorder_level AND a new movement is recorded (write-time trigger).
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    on_hand = get_item_total_on_hand(db, item.id)
    if on_hand > item.reorder_level:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item '{item.name}' is not currently below its reorder level (on-hand: {on_hand}, reorder: {item.reorder_level}). Nothing to dismiss.",
        )

    # Upsert alert_state row
    state = db.query(AlertState).filter(AlertState.item_id == item_id).first()
    if not state:
        state = AlertState(item_id=item_id)
        db.add(state)

    state.is_dismissed = True
    state.dismissed_at = datetime.now(timezone.utc)
    state.dismissed_by = current_user.id
    db.commit()
    db.refresh(state)

    dismissed_by_name = current_user.name

    return AlertOut(
        item_id=item.id,
        sku=item.sku,
        name=item.name,
        category_name=item.category.name if item.category else None,
        unit_of_measure=item.unit_of_measure,
        reorder_level=item.reorder_level,
        on_hand=on_hand,
        deficit=max(0, item.reorder_level - on_hand),
        is_dismissed=True,
        dismissed_at=state.dismissed_at,
        dismissed_by_name=dismissed_by_name,
    )


@router.post("/{item_id}/undismiss", response_model=AlertOut)
def undismiss_alert(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Manager manually re-activates a dismissed alert without a new movement.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    state = db.query(AlertState).filter(AlertState.item_id == item_id).first()
    if state:
        state.is_dismissed = False
        state.dismissed_at = None
        state.dismissed_by = None
        db.commit()

    on_hand = get_item_total_on_hand(db, item.id)
    return AlertOut(
        item_id=item.id,
        sku=item.sku,
        name=item.name,
        category_name=item.category.name if item.category else None,
        unit_of_measure=item.unit_of_measure,
        reorder_level=item.reorder_level,
        on_hand=on_hand,
        deficit=max(0, item.reorder_level - on_hand),
        is_dismissed=False,
        dismissed_at=None,
        dismissed_by_name=None,
    )
