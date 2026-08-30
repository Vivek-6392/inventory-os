from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Item, ItemHistory, User
from app.schemas.history import ItemHistoryOut, NoteCreate
from app.middleware.auth import require_any

router = APIRouter(prefix="/api/items", tags=["history"])


@router.get("/{item_id}/history", response_model=List[ItemHistoryOut])
def get_item_history(
    item_id: UUID,
    action_type: Optional[str] = Query(
        "ALL",
        description="Filter history by type: 'ALL', 'CHANGES' (creation & field edits), or 'NOTES'",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 6: Every change to an item — creation, edits to fields, archiving,
    restoration, and notes left by staff or managers — is recorded with timestamp
    and author. Changes can be filtered by type.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    query = (
        db.query(ItemHistory)
        .options(joinedload(ItemHistory.changed_by_user))
        .filter(ItemHistory.item_id == item_id)
    )

    clean_type = action_type.upper() if action_type else "ALL"
    if clean_type == "NOTES":
        query = query.filter(ItemHistory.action == "NOTE")
    elif clean_type == "CHANGES":
        query = query.filter(ItemHistory.action.in_(["CREATED", "FIELD_CHANGE"]))

    history_records = query.order_by(ItemHistory.created_at.desc()).all()
    return history_records


@router.post("/{item_id}/notes", response_model=ItemHistoryOut, status_code=status.HTTP_201_CREATED)
def add_item_note(
    item_id: UUID,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 6: Notes can be left by both staff and managers.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    clean_note = payload.note.strip()
    if not clean_note:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note content cannot be empty",
        )

    history = ItemHistory(
        item_id=item.id,
        action="NOTE",
        note=clean_note,
        changed_by=current_user.id,
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    # Load relationship for response
    history.changed_by_user = current_user

    return history
