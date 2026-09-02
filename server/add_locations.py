"""
Script to add more realistic enterprise locations to InventoryOS,
assign staff members, and record initial stock positions.
"""
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal
from app.models.models import Location, User, Item, StockMovement, MovementKind

def add_more_locations():
    db = SessionLocal()
    try:
        new_locations_data = [
            ("North Distribution Center", "Regional bulk storage and dispatch hub (Delhi NCR)"),
            ("South Fulfillment Hub", "High-velocity rapid replenishment depot (Bengaluru)"),
            ("West Logistics Depot", "Container consolidation & maritime import center (Mumbai)"),
            ("Cold Storage Facility", "Climate-controlled zone for temperature-sensitive items"),
            ("Quarantine & Returns Depot", "Quality assurance, RMA triage, and return inspection facility"),
        ]

        created_locations = []
        for name, desc in new_locations_data:
            existing = db.query(Location).filter(Location.name == name).first()
            if not existing:
                loc = Location(name=name, description=desc)
                db.add(loc)
                created_locations.append(loc)
                print(f"Added location: {name}")
            else:
                created_locations.append(existing)
                print(f"Location already exists: {name}")

        db.commit()

        # Refresh instances
        all_locations = db.query(Location).all()
        users = db.query(User).all()
        items = db.query(Item).all()
        manager = next((u for u in users if u.role.value == "MANAGER"), users[0])
        staff1 = next((u for u in users if u.email == "staff1@invstock.com"), None)
        staff2 = next((u for u in users if u.email == "staff2@invstock.com"), None)

        # Assign staff to some of the new locations
        if staff1:
            north_loc = next((l for l in all_locations if "North" in l.name), None)
            if north_loc and north_loc not in staff1.assigned_locations:
                staff1.assigned_locations.append(north_loc)
                print(f"Assigned staff1 to {north_loc.name}")

        if staff2:
            south_loc = next((l for l in all_locations if "South" in l.name), None)
            west_loc = next((l for l in all_locations if "West" in l.name), None)
            if south_loc and south_loc not in staff2.assigned_locations:
                staff2.assigned_locations.append(south_loc)
                print(f"Assigned staff2 to {south_loc.name}")
            if west_loc and west_loc not in staff2.assigned_locations:
                staff2.assigned_locations.append(west_loc)
                print(f"Assigned staff2 to {west_loc.name}")

        db.commit()

        # Record initial receipt movements into each new location so they have visible stock on the dashboard
        now = datetime.now(timezone.utc)
        stock_allocations = [
            ("North Distribution Center", [("Power Drill", 80), ("Safety Goggles", 120), ("LED Light Panel", 60)]),
            ("South Fulfillment Hub", [("Printer Paper A4", 250), ("Cat6 Ethernet Cable 10m", 150), ("HDMI Cable", 90)]),
            ("West Logistics Depot", [("Heavy Duty Industrial Widget", 110), ("M8 Hex Head Steel Bolts", 300)]),
            ("Cold Storage Facility", [("LED Light Panel", 40), ("Safety Goggles", 50)]),
            ("Quarantine & Returns Depot", [("Power Drill", 5), ("HDMI Cable", 8)]),
        ]

        item_map = {i.name: i for i in items}
        loc_map = {l.name: l for l in all_locations}

        for loc_name, allocations in stock_allocations:
            loc = loc_map.get(loc_name)
            if not loc:
                continue
            
            # Check if this location already has movements
            existing_mv_count = db.query(StockMovement).filter(
                (StockMovement.location_id == loc.id) | (StockMovement.to_location_id == loc.id)
            ).count()

            if existing_mv_count == 0:
                for item_name, qty in allocations:
                    item = item_map.get(item_name)
                    if item:
                        mv = StockMovement(
                            item_id=item.id,
                            kind=MovementKind.RECEIPT,
                            quantity=qty,
                            location_id=loc.id,
                            reason=f"Initial stock allocation for {loc_name}",
                            recorded_by=manager.id,
                            created_at=now - timedelta(days=3),
                        )
                        db.add(mv)
                        print(f"Received {qty} of {item_name} at {loc_name}")

        db.commit()
        total_locs = db.query(Location).count()
        print(f"Total locations in database is now: {total_locs}")
    except Exception as e:
        db.rollback()
        print(f"Error adding locations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_more_locations()
