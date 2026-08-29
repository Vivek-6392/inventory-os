"""
Seed script — populates the database with demo data for all roles.

Usage:
    python seed.py

Requires DATABASE_URL to be set in the environment or .env file.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.models.models import (
    User,
    Location,
    Category,
    Item,
    StockMovement,
    ItemHistory,
    AlertState,
    UserRole,
    MovementKind,
    user_locations,
)
from app.middleware.auth import hash_password


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # ---------------------------------------------------------------
        # Users
        # ---------------------------------------------------------------
        manager = User(
            email="manager@invstock.com",
            password_hash=hash_password("manager123"),
            name="Alice Manager",
            role=UserRole.MANAGER,
        )
        staff1 = User(
            email="staff1@invstock.com",
            password_hash=hash_password("staff123"),
            name="Bob Staff",
            role=UserRole.STAFF,
        )
        staff2 = User(
            email="staff2@invstock.com",
            password_hash=hash_password("staff123"),
            name="Carol Staff",
            role=UserRole.STAFF,
        )
        db.add_all([manager, staff1, staff2])
        db.flush()
        print(f"  ✓ Created {3} users")

        # ---------------------------------------------------------------
        # Locations
        # ---------------------------------------------------------------
        loc_warehouse = Location(name="Main Warehouse", description="Central distribution warehouse")
        loc_retail1 = Location(name="Retail Floor A", description="Downtown retail location")
        loc_retail2 = Location(name="Retail Floor B", description="Mall retail location")
        db.add_all([loc_warehouse, loc_retail1, loc_retail2])
        db.flush()
        print(f"  ✓ Created {3} locations")

        # Assign staff to locations
        staff1.assigned_locations.append(loc_warehouse)
        staff1.assigned_locations.append(loc_retail1)
        staff2.assigned_locations.append(loc_retail2)
        db.flush()
        print("  ✓ Assigned staff to locations")

        # ---------------------------------------------------------------
        # Categories
        # ---------------------------------------------------------------
        cat_electronics = Category(name="Electronics")
        cat_hardware = Category(name="Hardware")
        cat_safety = Category(name="Safety Equipment")
        cat_office = Category(name="Office Supplies")
        cat_plumbing = Category(name="Plumbing")
        db.add_all([cat_electronics, cat_hardware, cat_safety, cat_office, cat_plumbing])
        db.flush()
        print(f"  ✓ Created {5} categories")

        # ---------------------------------------------------------------
        # Items
        # ---------------------------------------------------------------
        items_data = [
            ("SKU-001", "LED Light Panel", "High-efficiency LED panel for warehouse lighting", "pcs", 20, cat_electronics),
            ("SKU-002", "Power Drill", "Cordless 18V power drill with battery", "pcs", 10, cat_hardware),
            ("SKU-003", "Safety Goggles", "Impact-resistant safety goggles ANSI Z87.1", "pcs", 50, cat_safety),
            ("SKU-004", "Printer Paper A4", "80gsm white printer paper, 500 sheets/ream", "reams", 30, cat_office),
            ("SKU-005", "PVC Pipe 2in", "Schedule 40 PVC pipe, 10ft length", "pcs", 15, cat_plumbing),
            ("SKU-006", "USB-C Cable", "USB-C to USB-C cable, 6ft braided", "pcs", 25, cat_electronics),
            ("SKU-007", "Hex Bolt M10", "M10x30mm stainless steel hex bolt", "pcs", 100, cat_hardware),
            ("SKU-008", "Hard Hat", "OSHA-compliant white hard hat", "pcs", 15, cat_safety),
            ("SKU-009", "Stapler Heavy Duty", "Heavy duty stapler, 100-sheet capacity", "pcs", 8, cat_office),
            ("SKU-010", "Copper Elbow 1in", "1-inch copper 90° elbow fitting", "pcs", 40, cat_plumbing),
            ("SKU-011", "HDMI Cable", "HDMI 2.1 cable, 10ft", "pcs", 20, cat_electronics),
            ("SKU-012", "Screwdriver Set", "Phillips & flathead set, 12 pieces", "sets", 5, cat_hardware),
        ]

        items = []
        for sku, name, desc, uom, reorder, cat in items_data:
            item = Item(
                sku=sku,
                name=name,
                description=desc,
                unit_of_measure=uom,
                reorder_level=reorder,
                category_id=cat.id,
            )
            items.append(item)
        db.add_all(items)
        db.flush()
        print(f"  ✓ Created {len(items)} items")

        # Create item history for creation
        for item in items:
            history = ItemHistory(
                item_id=item.id,
                action="CREATED",
                changed_by=manager.id,
            )
            db.add(history)
        db.flush()

        # ---------------------------------------------------------------
        # Stock Movements (build up inventory)
        # ---------------------------------------------------------------
        movements = [
            # Initial receipts at warehouse
            (items[0], MovementKind.RECEIPT, 50, loc_warehouse, None, None, manager),
            (items[1], MovementKind.RECEIPT, 30, loc_warehouse, None, None, manager),
            (items[2], MovementKind.RECEIPT, 100, loc_warehouse, None, None, manager),
            (items[3], MovementKind.RECEIPT, 80, loc_warehouse, None, None, manager),
            (items[4], MovementKind.RECEIPT, 40, loc_warehouse, None, None, manager),
            (items[5], MovementKind.RECEIPT, 60, loc_warehouse, None, None, manager),
            (items[6], MovementKind.RECEIPT, 200, loc_warehouse, None, None, manager),
            (items[7], MovementKind.RECEIPT, 25, loc_warehouse, None, None, manager),
            (items[8], MovementKind.RECEIPT, 20, loc_warehouse, None, None, manager),
            (items[9], MovementKind.RECEIPT, 80, loc_warehouse, None, None, manager),
            (items[10], MovementKind.RECEIPT, 45, loc_warehouse, None, None, manager),
            (items[11], MovementKind.RECEIPT, 15, loc_warehouse, None, None, manager),
            # Transfers to retail
            (items[0], MovementKind.TRANSFER, 10, None, loc_warehouse, loc_retail1, staff1),
            (items[2], MovementKind.TRANSFER, 20, None, loc_warehouse, loc_retail1, staff1),
            (items[3], MovementKind.TRANSFER, 15, None, loc_warehouse, loc_retail2, staff2),
            (items[5], MovementKind.TRANSFER, 15, None, loc_warehouse, loc_retail2, staff2),
            # Issues (sales)
            (items[0], MovementKind.ISSUE, 5, loc_retail1, None, None, staff1),
            (items[2], MovementKind.ISSUE, 8, loc_retail1, None, None, staff1),
            (items[3], MovementKind.ISSUE, 10, loc_retail2, None, None, staff2),
            # Adjustments
            (items[1], MovementKind.ADJUSTMENT, 2, loc_warehouse, None, None, manager),
        ]

        for item, kind, qty, loc, from_loc, to_loc, recorder in movements:
            mvmt = StockMovement(
                item_id=item.id,
                kind=kind,
                quantity=qty,
                location_id=loc.id if loc else None,
                from_location_id=from_loc.id if from_loc else None,
                to_location_id=to_loc.id if to_loc else None,
                reason="Inventory count correction — 2 units found during audit" if kind == MovementKind.ADJUSTMENT else None,
                recorded_by=recorder.id,
            )
            db.add(mvmt)
        db.flush()
        print(f"  ✓ Created {len(movements)} stock movements")

        # ---------------------------------------------------------------
        # Alert state — initialize for all items
        # ---------------------------------------------------------------
        for item in items:
            alert = AlertState(item_id=item.id, is_dismissed=False)
            db.add(alert)
        db.flush()
        print("  ✓ Initialized alert state for all items")

        db.commit()
        print("\n✅ Database seeded successfully!")
        print("\nDemo credentials:")
        print("  Manager: manager@invstock.com / manager123")
        print("  Staff 1: staff1@invstock.com  / staff123")
        print("  Staff 2: staff2@invstock.com  / staff123")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
