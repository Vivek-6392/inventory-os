from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import User, Location, UserRole
from app.schemas.auth import UserOut
from app.schemas.location import LocationOut
from app.middleware.auth import require_manager, require_any

router = APIRouter(prefix="/api/users", tags=["users"])


class UserLocationAssignment(BaseModel):
    location_ids: List[UUID]


class UserWithLocationsOut(BaseModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    assigned_locations: List[LocationOut]

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserWithLocationsOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Goal 1: Managers can view all users and their assigned locations."""
    users = (
        db.query(User)
        .options(joinedload(User.assigned_locations))
        .order_by(User.name.asc())
        .all()
    )
    return users


@router.get("/staff", response_model=List[UserOut])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """List staff users for assignment dropdowns."""
    return db.query(User).filter(User.role == UserRole.STAFF).order_by(User.name.asc()).all()


@router.put("/{user_id}/locations", response_model=UserWithLocationsOut)
def assign_user_locations(
    user_id: UUID,
    payload: UserLocationAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 1 & 5: Manager assigns a user to multiple locations.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    locations = db.query(Location).filter(Location.id.in_(payload.location_ids)).all()
    user.assigned_locations = locations
    db.commit()
    db.refresh(user)
    return user
