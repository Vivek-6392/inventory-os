import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
    CheckConstraint,
    Table,
    UUID,
    Float,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

import enum


class UserRole(str, enum.Enum):
    MANAGER = "MANAGER"
    STAFF = "STAFF"


class MovementKind(str, enum.Enum):
    RECEIPT = "RECEIPT"
    ISSUE = "ISSUE"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"


# ---------------------------------------------------------------------------
# Association table: user <-> location (many-to-many)
# ---------------------------------------------------------------------------

user_locations = Table(
    "user_locations",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column(
        "location_id",
        UUID(as_uuid=True),
        ForeignKey("locations.id"),
        primary_key=True,
    ),
)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role"), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    assigned_locations = relationship(
        "Location", secondary=user_locations, back_populates="assigned_staff"
    )
    recorded_movements = relationship("StockMovement", back_populates="recorder")
    history_changes = relationship("ItemHistory", back_populates="changed_by_user")


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String(255), nullable=True)
    type = Column(String(100), nullable=True, default="Warehouse")
    is_active = Column(Boolean, nullable=True, default=True)
    image_url = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    assigned_staff = relationship(
        "User", secondary=user_locations, back_populates="assigned_locations"
    )


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    items = relationship("Item", back_populates="category")


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------


class Item(Base):
    __tablename__ = "items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    unit_of_measure = Column(String(50), nullable=False)
    reorder_level = Column(Integer, nullable=False, default=0)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    category = relationship("Category", back_populates="items")
    movements = relationship("StockMovement", back_populates="item")
    history = relationship("ItemHistory", back_populates="item", order_by="ItemHistory.created_at")
    alert_state = relationship("AlertState", back_populates="item", uselist=False)


# ---------------------------------------------------------------------------
# Stock Movements (APPEND-ONLY)
# ---------------------------------------------------------------------------


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint(
            "(kind = 'ADJUSTMENT' AND quantity != 0) OR (kind != 'ADJUSTMENT' AND quantity > 0)",
            name="ck_movement_quantity_valid",
        ),
        CheckConstraint(
            "kind != 'ADJUSTMENT' OR reason IS NOT NULL",
            name="ck_adjustment_has_reason",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False, index=True
    )
    kind = Column(SAEnum(MovementKind, name="movement_kind"), nullable=False)
    quantity = Column(Integer, nullable=False)
    location_id = Column(
        UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True
    )  # receipt / issue / adjustment
    from_location_id = Column(
        UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True
    )  # transfer source
    to_location_id = Column(
        UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True
    )  # transfer destination
    reason = Column(Text, nullable=True)  # required for adjustments
    recorded_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    item = relationship("Item", back_populates="movements")
    recorder = relationship("User", back_populates="recorded_movements")
    location = relationship("Location", foreign_keys=[location_id])
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])


# ---------------------------------------------------------------------------
# Item History / Audit Trail (APPEND-ONLY)
# ---------------------------------------------------------------------------


class ItemHistory(Base):
    __tablename__ = "item_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False, index=True
    )
    action = Column(
        String(50), nullable=False
    )  # 'CREATED', 'FIELD_CHANGE', 'NOTE'
    field_name = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    changed_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    item = relationship("Item", back_populates="history")
    changed_by_user = relationship("User", back_populates="history_changes")


# ---------------------------------------------------------------------------
# Alert State (one row per item — write-time re-trigger)
# ---------------------------------------------------------------------------


class AlertState(Base):
    __tablename__ = "alert_state"

    item_id = Column(
        UUID(as_uuid=True), ForeignKey("items.id"), primary_key=True
    )
    is_dismissed = Column(Boolean, nullable=False, default=False)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    item = relationship("Item", back_populates="alert_state")
    dismissed_by_user = relationship("User")
