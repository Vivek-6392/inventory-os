from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, case

from app.database import get_db
from app.models.models import Location, User, UserRole, StockMovement, MovementKind, user_locations
from app.schemas.location import LocationCreate, LocationUpdate, LocationOut, LocationStaffAssignment, StaffBrief
from app.schemas.auth import UserOut
from app.middleware.auth import require_manager, require_any

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=List[LocationOut])
def list_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 5: List all locations ordered by name, with counts of assigned staff,
    recorded movements, total stock units, and assigned staff details.
    Uses batch aggregations to eliminate N+1 latency.
    """
    locations = (
        db.query(Location)
        .options(joinedload(Location.assigned_staff))
        .order_by(Location.name.asc())
        .all()
    )

    # 1. Direct receipts, issues, adjustments grouped by location
    net_direct = case(
        (StockMovement.kind == MovementKind.RECEIPT, StockMovement.quantity),
        (StockMovement.kind == MovementKind.ISSUE, -StockMovement.quantity),
        (StockMovement.kind == MovementKind.ADJUSTMENT, StockMovement.quantity),
        else_=0,
    )
    direct_rows = (
        db.query(StockMovement.location_id, func.sum(net_direct), func.count(StockMovement.id))
        .group_by(StockMovement.location_id)
        .all()
    )
    direct_stock = {row[0]: (row[1] or 0) for row in direct_rows if row[0]}
    direct_count = {row[0]: (row[2] or 0) for row in direct_rows if row[0]}

    # 2. Transfers into destination location
    t_in_rows = (
        db.query(StockMovement.to_location_id, func.sum(StockMovement.quantity), func.count(StockMovement.id))
        .filter(StockMovement.kind == MovementKind.TRANSFER)
        .group_by(StockMovement.to_location_id)
        .all()
    )
    transfers_in = {row[0]: (row[1] or 0) for row in t_in_rows if row[0]}
    t_in_count = {row[0]: (row[2] or 0) for row in t_in_rows if row[0]}

    # 3. Transfers out of origin location
    t_out_rows = (
        db.query(StockMovement.from_location_id, func.sum(StockMovement.quantity), func.count(StockMovement.id))
        .filter(StockMovement.kind == MovementKind.TRANSFER)
        .group_by(StockMovement.from_location_id)
        .all()
    )
    transfers_out = {row[0]: (row[1] or 0) for row in t_out_rows if row[0]}
    t_out_count = {row[0]: (row[2] or 0) for row in t_out_rows if row[0]}

    result = []
    for loc in locations:
        staff_cnt = len(loc.assigned_staff)
        staff_list = [
            StaffBrief(id=s.id, name=s.name, email=s.email)
            for s in loc.assigned_staff
        ]
        mv_cnt = direct_count.get(loc.id, 0) + t_in_count.get(loc.id, 0) + t_out_count.get(loc.id, 0)
        tot_stock = max(0, direct_stock.get(loc.id, 0) + transfers_in.get(loc.id, 0) - transfers_out.get(loc.id, 0))

        loc_dict = {
            "id": loc.id,
            "name": loc.name,
            "description": loc.description,
            "address": getattr(loc, "address", None),
            "type": getattr(loc, "type", "Warehouse") or "Warehouse",
            "is_active": getattr(loc, "is_active", True) if getattr(loc, "is_active", True) is not None else True,
            "image_url": getattr(loc, "image_url", None),
            "latitude": getattr(loc, "latitude", None),
            "longitude": getattr(loc, "longitude", None),
            "created_at": loc.created_at,
            "staff_count": staff_cnt,
            "movement_count": mv_cnt,
            "total_stock": tot_stock,
            "assigned_staff": staff_list,
        }
        result.append(LocationOut(**loc_dict))

    return result


@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Goal 1: Managers can create locations."""
    clean_name = payload.name.strip()
    existing = db.query(Location).filter(Location.name.ilike(clean_name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A location with name '{clean_name}' already exists",
        )

    location = Location(
        name=clean_name,
        description=payload.description.strip() if payload.description else None,
        address=payload.address.strip() if payload.address else None,
        type=payload.type.strip() if payload.type else "Warehouse",
        is_active=payload.is_active if payload.is_active is not None else True,
        image_url=payload.image_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(location)
    db.commit()
    db.refresh(location)

    return LocationOut(
        id=location.id,
        name=location.name,
        description=location.description,
        address=location.address,
        type=location.type or "Warehouse",
        is_active=location.is_active if location.is_active is not None else True,
        image_url=location.image_url,
        latitude=location.latitude,
        longitude=location.longitude,
        created_at=location.created_at,
        staff_count=0,
        movement_count=0,
    )


@router.get("/{location_id}", response_model=LocationOut)
def get_location(
    location_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """Get single location by ID."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    staff_cnt = len(location.assigned_staff)
    mv_cnt = (
        db.query(StockMovement)
        .filter(
            or_(
                StockMovement.location_id == location.id,
                StockMovement.from_location_id == location.id,
                StockMovement.to_location_id == location.id,
            )
        )
        .count()
    )

    return LocationOut(
        id=location.id,
        name=location.name,
        description=location.description,
        address=getattr(location, "address", None),
        type=getattr(location, "type", "Warehouse") or "Warehouse",
        is_active=getattr(location, "is_active", True) if getattr(location, "is_active", True) is not None else True,
        image_url=getattr(location, "image_url", None),
        latitude=getattr(location, "latitude", None),
        longitude=getattr(location, "longitude", None),
        created_at=location.created_at,
        staff_count=staff_cnt,
        movement_count=mv_cnt,
    )


@router.put("/{location_id}", response_model=LocationOut)
def update_location(
    location_id: UUID,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Goal 1: Managers can update locations."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    if payload.name:
        clean_name = payload.name.strip()
        existing = (
            db.query(Location)
            .filter(Location.name.ilike(clean_name), Location.id != location.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another location with name '{clean_name}' already exists",
            )
        location.name = clean_name

    if payload.description is not None:
        location.description = payload.description.strip() if payload.description else None
    if payload.address is not None:
        location.address = payload.address.strip() if payload.address else None
    if payload.type is not None:
        location.type = payload.type.strip() if payload.type else "Warehouse"
    if payload.is_active is not None:
        location.is_active = payload.is_active
    if payload.image_url is not None:
        location.image_url = payload.image_url
    if payload.latitude is not None:
        location.latitude = payload.latitude
    if payload.longitude is not None:
        location.longitude = payload.longitude

    db.commit()
    db.refresh(location)

    staff_cnt = len(location.assigned_staff)
    mv_cnt = (
        db.query(StockMovement)
        .filter(
            or_(
                StockMovement.location_id == location.id,
                StockMovement.from_location_id == location.id,
                StockMovement.to_location_id == location.id,
            )
        )
        .count()
    )

    return LocationOut(
        id=location.id,
        name=location.name,
        description=location.description,
        address=getattr(location, "address", None),
        type=getattr(location, "type", "Warehouse") or "Warehouse",
        is_active=getattr(location, "is_active", True) if getattr(location, "is_active", True) is not None else True,
        image_url=getattr(location, "image_url", None),
        latitude=getattr(location, "latitude", None),
        longitude=getattr(location, "longitude", None),
        created_at=location.created_at,
        staff_count=staff_cnt,
        movement_count=mv_cnt,
    )


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Delete a location if no stock movements have been recorded at it (Manager only)."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    mv_cnt = (
        db.query(StockMovement)
        .filter(
            or_(
                StockMovement.location_id == location.id,
                StockMovement.from_location_id == location.id,
                StockMovement.to_location_id == location.id,
            )
        )
        .count()
    )
    if mv_cnt > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete location: {mv_cnt} stock movement(s) are recorded in the ledger against this location.",
        )

    # Remove user assignments first
    location.assigned_staff.clear()
    db.delete(location)
    db.commit()
    return None


@router.get("/{location_id}/staff", response_model=List[UserOut])
def get_location_staff(
    location_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List staff members assigned to a specific location."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    return location.assigned_staff


@router.put("/{location_id}/staff", response_model=List[UserOut])
def set_location_staff(
    location_id: UUID,
    payload: LocationStaffAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 1 & 5: Managers assign/unassign staff members to a location.
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    users = db.query(User).filter(User.id.in_(payload.staff_user_ids)).all()
    location.assigned_staff = users
    db.commit()
    return location.assigned_staff
