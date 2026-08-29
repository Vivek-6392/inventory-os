from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.models import Location, User, UserRole, StockMovement, user_locations
from app.schemas.location import LocationCreate, LocationUpdate, LocationOut, LocationStaffAssignment
from app.schemas.auth import UserOut
from app.middleware.auth import require_manager, require_any

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=List[LocationOut])
def list_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 5: List all locations ordered by name, with counts of assigned staff
    and recorded movements.
    """
    locations = db.query(Location).order_by(Location.name.asc()).all()

    result = []
    for loc in locations:
        staff_cnt = len(loc.assigned_staff)
        mv_cnt = (
            db.query(StockMovement)
            .filter(
                or_(
                    StockMovement.location_id == loc.id,
                    StockMovement.from_location_id == loc.id,
                    StockMovement.to_location_id == loc.id,
                )
            )
            .count()
        )
        loc_dict = {
            "id": loc.id,
            "name": loc.name,
            "description": loc.description,
            "created_at": loc.created_at,
            "staff_count": staff_cnt,
            "movement_count": mv_cnt,
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
    )
    db.add(location)
    db.commit()
    db.refresh(location)

    return LocationOut(
        id=location.id,
        name=location.name,
        description=location.description,
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
