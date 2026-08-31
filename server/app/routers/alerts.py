from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import AlertState, Item, User
from app.schemas.alert import AlertOut, AlertCountOut
from app.middleware.auth import require_any, require_manager
from app.services.stock_service import get_item_total_on_hand, get_multiple_items_stock

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _build_alert_list(db: Session, include_dismissed: bool = False) -> List[AlertOut]:
    """
    Build alert list: all non-archived items where on_hand <= reorder_level.
    - include_dismissed=False → only active alerts (is_dismissed=False)
    - include_dismissed=True  → active + dismissed alerts below reorder level

    PERFORMANCE: batch-fetches stock levels and alert states to avoid N+1 queries.
    """
    items = db.query(Item).options(joinedload(Item.category)).filter(Item.archived == False).all()
    if not items:
        return []

    item_ids = [item.id for item in items]

    # Batch-fetch all stock values (single aggregation query)
    stock_map = get_multiple_items_stock(db, item_ids)

    # Batch-fetch alert states + dismissed_by_user in one query (no N+1)
    alert_states = (
        db.query(AlertState)
        .options(joinedload(AlertState.dismissed_by_user))
        .filter(AlertState.item_id.in_(item_ids))
        .all()
    )
    alert_state_map = {str(state.item_id): state for state in alert_states}

    alerts = []
    for item in items:
        on_hand = stock_map.get(item.id, 0)
        if on_hand > item.reorder_level:
            continue  # stock is fine, skip

        state = alert_state_map.get(str(item.id))
        is_dismissed = state.is_dismissed if state else False

        if not include_dismissed and is_dismissed:
            continue  # skip dismissed in default view

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
    Used by the Layout badge for real-time alert indicator.
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
    """
    return _build_alert_list(db, include_dismissed=True)


@router.post("/{item_id}/dismiss", response_model=AlertOut)
def dismiss_alert(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 5: Manager dismisses a low-stock alert.
    Guards: item must actually be below reorder level to dismiss.
    Auto re-trigger: next movement that raises stock above reorder resets is_dismissed=False.
    """
    item = db.query(Item).options(joinedload(Item.category)).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    on_hand = get_item_total_on_hand(db, item.id)
    if on_hand > item.reorder_level:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item '{item.name}' is not currently below its reorder level "
                   f"(on-hand: {on_hand}, reorder: {item.reorder_level}). Nothing to dismiss.",
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
        dismissed_by_name=current_user.name,
    )


@router.post("/{item_id}/undismiss", response_model=AlertOut)
def undismiss_alert(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Manager manually re-activates a dismissed alert without needing a new movement.
    """
    item = db.query(Item).options(joinedload(Item.category)).filter(Item.id == item_id).first()
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
