from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.models import UserRole


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.STAFF


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str  # user id
    role: str
    exp: int


class LocationBasicOut(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    created_at: datetime
    assigned_locations: list[LocationBasicOut] = []

    class Config:
        from_attributes = True
