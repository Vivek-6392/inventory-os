import math
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, or_

from app.database import get_db
from app.models.models import Item, Category, StockMovement, MovementKind, ItemHistory, AlertState, User
from app.schemas.item import ItemCreate, ItemUpdate, ItemOut, PaginatedItemsResponse
from app.services.stock_service import get_item_total_on_hand, get_item_stock_by_location
from app.middleware.auth import require_manager, require_any

router = APIRouter(prefix="/api/items", tags=["items"])


def _build_stock_subquery():
    """Build subquery for total on-hand quantity per item."""
    net_qty = case(
        (StockMovement.kind == MovementKind.RECEIPT, StockMovement.quantity),
        (StockMovement.kind == MovementKind.ISSUE, -StockMovement.quantity),
        (StockMovement.kind == MovementKind.ADJUSTMENT, StockMovement.quantity),
        else_=0,
    )
    return (
        func.coalesce(func.sum(net_qty), 0).label("computed_on_hand")
    )


@router.get("", response_model=PaginatedItemsResponse)
def list_items(
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    location_id: Optional[UUID] = Query(None, description="Filter items at location"),
    archived: Optional[bool] = Query(False, description="Filter by archived status (default false)"),
    below_reorder: Optional[bool] = Query(False, description="Filter items at or below reorder level"),
    sort_by: str = Query("name", description="Sort by: name, sku, reorder_level, on_hand, created_at"),
    sort_order: str = Query("asc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(15, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 6: Finding items — Server-side text search over name and SKU,
    filters for category, location, archived status, at-or-below-reorder,
    sorting by name, on-hand quantity, reorder level, and pagination.
    """
    # Subquery for total stock per item
    net_qty = case(
        (StockMovement.kind == MovementKind.RECEIPT, StockMovement.quantity),
        (StockMovement.kind == MovementKind.ISSUE, -StockMovement.quantity),
        (StockMovement.kind == MovementKind.ADJUSTMENT, StockMovement.quantity),
        else_=0,
    )
    stock_subquery = (
        db.query(
            StockMovement.item_id.label("mv_item_id"),
            func.coalesce(func.sum(net_qty), 0).label("total_on_hand"),
        )
        .group_by(StockMovement.item_id)
        .subquery()
    )

    # Base query joined with category and stock subquery
    query = (
        db.query(
            Item,
            func.coalesce(stock_subquery.c.total_on_hand, 0).label("on_hand"),
        )
        .outerjoin(stock_subquery, Item.id == stock_subquery.c.mv_item_id)
        .options(joinedload(Item.category))
    )

    # Filter by archived status
    if archived is not None:
        query = query.filter(Item.archived == archived)

    # Text search on name or SKU
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(Item.name.ilike(term), Item.sku.ilike(term))
        )

    # Category filter
    if category_id:
        query = query.filter(Item.category_id == category_id)

    # Location filter (items that have movements at location)
    if location_id:
        location_item_ids = (
            db.query(StockMovement.item_id)
            .filter(
                or_(
                    StockMovement.location_id == location_id,
                    StockMovement.from_location_id == location_id,
                    StockMovement.to_location_id == location_id,
                )
            )
            .distinct()
        )
        query = query.filter(Item.id.in_(location_item_ids))

    # At or below reorder level filter
    if below_reorder:
        query = query.filter(
            func.coalesce(stock_subquery.c.total_on_hand, 0) <= Item.reorder_level
        )

    # Total matching count
    total = query.count()

    # Sorting
    on_hand_expr = func.coalesce(stock_subquery.c.total_on_hand, 0)
    if sort_by == "on_hand":
        col = on_hand_expr.desc() if sort_order == "desc" else on_hand_expr.asc()
        query = query.order_by(col)
    elif sort_by == "sku":
        col = Item.sku.desc() if sort_order == "desc" else Item.sku.asc()
        query = query.order_by(col)
    elif sort_by == "reorder_level":
        col = Item.reorder_level.desc() if sort_order == "desc" else Item.reorder_level.asc()
        query = query.order_by(col)
    elif sort_by == "created_at":
        col = Item.created_at.desc() if sort_order == "desc" else Item.created_at.asc()
        query = query.order_by(col)
    else:  # Default sort by name
        col = Item.name.desc() if sort_order == "desc" else Item.name.asc()
        query = query.order_by(col)

    # Pagination
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    # Format response items
    items_out = []
    for item_model, on_hand_val in results:
        item_dict = {
            "id": item_model.id,
            "sku": item_model.sku,
            "name": item_model.name,
            "description": item_model.description,
            "unit_of_measure": item_model.unit_of_measure,
            "reorder_level": item_model.reorder_level,
            "category_id": item_model.category_id,
            "category": item_model.category,
            "archived": item_model.archived,
            "created_at": item_model.created_at,
            "on_hand": int(on_hand_val or 0),
        }
        items_out.append(ItemOut(**item_dict))

    pages = math.ceil(total / limit) if total > 0 else 1

    return PaginatedItemsResponse(
        items=items_out,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{item_id}", response_model=ItemOut)
def get_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get single item with derived total on-hand quantity and per-location breakdown."""
    item = (
        db.query(Item)
        .options(joinedload(Item.category))
        .filter(Item.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    on_hand = get_item_total_on_hand(db, item.id)
    stock_by_loc = get_item_stock_by_location(db, item.id)

    item_dict = {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "unit_of_measure": item.unit_of_measure,
        "reorder_level": item.reorder_level,
        "category_id": item.category_id,
        "category": item.category,
        "archived": item.archived,
        "created_at": item.created_at,
        "on_hand": on_hand,
        "stock_by_location": stock_by_loc,
    }
    return ItemOut(**item_dict)


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 2: Managers create items with SKU, name, description, unit of measure,
    reorder level, and category.
    Goal 9: Records creation in item_history audit trail.
    """
    clean_sku = payload.sku.strip().upper()
    existing = db.query(Item).filter(Item.sku == clean_sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An item with SKU '{clean_sku}' already exists",
        )

    if payload.category_id:
        cat = db.query(Category).filter(Category.id == payload.category_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected category does not exist",
            )

    item = Item(
        sku=clean_sku,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        unit_of_measure=payload.unit_of_measure.strip(),
        reorder_level=payload.reorder_level,
        category_id=payload.category_id,
    )
    db.add(item)
    db.flush()

    # Record creation in immutable history audit trail (Goal 9)
    history = ItemHistory(
        item_id=item.id,
        action="CREATED",
        changed_by=current_user.id,
    )
    db.add(history)

    # Initialize alert state
    alert = AlertState(item_id=item.id, is_dismissed=False)
    db.add(alert)

    db.commit()
    db.refresh(item)

    item_dict = {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "unit_of_measure": item.unit_of_measure,
        "reorder_level": item.reorder_level,
        "category_id": item.category_id,
        "category": item.category,
        "archived": item.archived,
        "created_at": item.created_at,
        "on_hand": 0,
    }
    return ItemOut(**item_dict)


@router.put("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: UUID,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 2: Managers can edit items.
    Goal 9: Audit trail records every field change with old and new value.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # Check SKU uniqueness if changed
    if payload.sku:
        clean_sku = payload.sku.strip().upper()
        if clean_sku != item.sku:
            existing = (
                db.query(Item)
                .filter(Item.sku == clean_sku, Item.id != item.id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An item with SKU '{clean_sku}' already exists",
                )
            # Track history
            db.add(
                ItemHistory(
                    item_id=item.id,
                    action="FIELD_CHANGE",
                    field_name="sku",
                    old_value=item.sku,
                    new_value=clean_sku,
                    changed_by=current_user.id,
                )
            )
            item.sku = clean_sku

    # Check Name change
    if payload.name and payload.name.strip() != item.name:
        db.add(
            ItemHistory(
                item_id=item.id,
                action="FIELD_CHANGE",
                field_name="name",
                old_value=item.name,
                new_value=payload.name.strip(),
                changed_by=current_user.id,
            )
        )
        item.name = payload.name.strip()

    # Check Description change
    if payload.description is not None:
        new_desc = payload.description.strip() if payload.description else None
        if new_desc != item.description:
            db.add(
                ItemHistory(
                    item_id=item.id,
                    action="FIELD_CHANGE",
                    field_name="description",
                    old_value=item.description,
                    new_value=new_desc,
                    changed_by=current_user.id,
                )
            )
            item.description = new_desc

    # Check Unit of measure change
    if payload.unit_of_measure and payload.unit_of_measure.strip() != item.unit_of_measure:
        db.add(
            ItemHistory(
                item_id=item.id,
                action="FIELD_CHANGE",
                field_name="unit_of_measure",
                old_value=item.unit_of_measure,
                new_value=payload.unit_of_measure.strip(),
                changed_by=current_user.id,
            )
        )
        item.unit_of_measure = payload.unit_of_measure.strip()

    # Check Reorder level change
    if payload.reorder_level is not None and payload.reorder_level != item.reorder_level:
        db.add(
            ItemHistory(
                item_id=item.id,
                action="FIELD_CHANGE",
                field_name="reorder_level",
                old_value=str(item.reorder_level),
                new_value=str(payload.reorder_level),
                changed_by=current_user.id,
            )
        )
        item.reorder_level = payload.reorder_level

    # Check Category change — guard against spurious None==None triggers
    if payload.category_id != item.category_id and not (payload.category_id is None and item.category_id is None):
        old_cat = db.query(Category).filter(Category.id == item.category_id).first() if item.category_id else None
        new_cat = db.query(Category).filter(Category.id == payload.category_id).first() if payload.category_id else None

        if payload.category_id and not new_cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected category does not exist",
            )

        db.add(
            ItemHistory(
                item_id=item.id,
                action="FIELD_CHANGE",
                field_name="category",
                old_value=old_cat.name if old_cat else "None",
                new_value=new_cat.name if new_cat else "None",
                changed_by=current_user.id,
            )
        )
        item.category_id = payload.category_id

    db.commit()
    db.refresh(item)

    on_hand = get_item_total_on_hand(db, item.id)
    item_dict = {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "unit_of_measure": item.unit_of_measure,
        "reorder_level": item.reorder_level,
        "category_id": item.category_id,
        "category": item.category,
        "archived": item.archived,
        "created_at": item.created_at,
        "on_hand": on_hand,
    }
    return ItemOut(**item_dict)


@router.patch("/{item_id}/archive", response_model=ItemOut)
def toggle_archive_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 2: Items can be archived and restored (Manager only).
    Goal 9: Audit trail records archiving/restoring.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    old_status = item.archived
    item.archived = not item.archived

    action_label = "ARCHIVED" if item.archived else "RESTORED"
    db.add(
        ItemHistory(
            item_id=item.id,
            action="FIELD_CHANGE",
            field_name="archived",
            old_value=str(old_status),
            new_value=str(item.archived),
            note=f"Item {action_label.lower()} by manager",
            changed_by=current_user.id,
        )
    )

    db.commit()
    db.refresh(item)

    on_hand = get_item_total_on_hand(db, item.id)
    item_dict = {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "unit_of_measure": item.unit_of_measure,
        "reorder_level": item.reorder_level,
        "category_id": item.category_id,
        "category": item.category,
        "archived": item.archived,
        "created_at": item.created_at,
        "on_hand": on_hand,
    }
    return ItemOut(**item_dict)
