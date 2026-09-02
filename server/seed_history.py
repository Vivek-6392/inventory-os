"""
Seed realistic historical movements across the previous 7 weeks
so the 8-Week trend chart exhibits lively, realistic volume for Receipts, Issues, and Transfers
instead of leaving empty space on the left.
"""
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal
from app.models.models import StockMovement, MovementKind, Item, Location, User

def populate_historical_movements():
    db = SessionLocal()
    try:
        # Check if historical movements already exist (> 2 weeks ago)
        two_weeks_ago = datetime.now(timezone.utc) - timedelta(weeks=2)
        existing_old = db.query(StockMovement).filter(StockMovement.created_at < two_weeks_ago).count()
        if existing_old > 0:
            print(f"Already have {existing_old} historical movements. Skipping.")
            return

        items = db.query(Item).all()
        locations = db.query(Location).all()
        user = db.query(User).first()

        if not items or not locations or not user:
            print("Missing prerequisite items/locations/users. Aborting.")
            return

        main_wh = next((l for l in locations if "Main" in l.name), locations[0])
        retail_a = next((l for l in locations if "Retail" in l.name or l.id != main_wh.id), locations[1])

        now = datetime.now(timezone.utc)

        # We will add movements for week 7, 6, 5, 4, 3, 2, 1 weeks ago
        weekly_plan = [
            # (weeks_ago, days_offset, kind, item_idx, qty, from_loc, to_loc, reason)
            (7, 47, MovementKind.RECEIPT, 0, 150, None, main_wh, "Initial supplier shipment"),
            (7, 46, MovementKind.TRANSFER, 0, 30, main_wh, retail_a, "Stock replenishment to Retail A"),
            (6, 40, MovementKind.RECEIPT, 1, 120, None, main_wh, "Bulk vendor delivery"),
            (6, 39, MovementKind.ISSUE, 0, 15, None, main_wh, "B2B client order fulfillment"),
            (5, 33, MovementKind.RECEIPT, 2, 200, None, main_wh, "Safety equipment batch arrival"),
            (5, 32, MovementKind.TRANSFER, 1, 25, main_wh, retail_a, "Retail store stock transfer"),
            (4, 26, MovementKind.RECEIPT, 3, 180, None, main_wh, "Quarterly office paper supply"),
            (4, 25, MovementKind.ISSUE, 2, 20, None, main_wh, "Dispatched for training operations"),
            (3, 19, MovementKind.RECEIPT, 4, 140, None, main_wh, "Plumbing supplies restock"),
            (3, 18, MovementKind.TRANSFER, 3, 35, main_wh, retail_a, "Stationery transfer to branch"),
            (3, 17, MovementKind.ISSUE, 1, 10, None, retail_a, "Over-the-counter customer sale"),
            (2, 12, MovementKind.RECEIPT, 0, 80, None, main_wh, "Fast-moving SKU top-up"),
            (2, 11, MovementKind.TRANSFER, 4, 20, main_wh, retail_a, "Store inventory balancing"),
            (2, 10, MovementKind.ISSUE, 3, 15, None, retail_a, "Customer sale invoice #4819"),
            (1, 5, MovementKind.RECEIPT, 1, 75, None, main_wh, "Mid-month hardware shipment"),
            (1, 4, MovementKind.TRANSFER, 0, 15, main_wh, retail_a, "Store display stock transfer"),
            (1, 3, MovementKind.ISSUE, 4, 8, None, main_wh, "Maintenance internal checkout"),
        ]

        for _, days_offset, kind, item_idx, qty, from_l, to_l, reason in weekly_plan:
            target_item = items[item_idx % len(items)]
            created_time = now - timedelta(days=days_offset)

            if kind == MovementKind.TRANSFER:
                mv = StockMovement(
                    item_id=target_item.id,
                    kind=MovementKind.TRANSFER,
                    quantity=qty,
                    from_location_id=from_l.id,
                    to_location_id=to_l.id,
                    reason=reason,
                    recorded_by=user.id,
                    created_at=created_time,
                )
            elif kind == MovementKind.RECEIPT:
                mv = StockMovement(
                    item_id=target_item.id,
                    kind=MovementKind.RECEIPT,
                    quantity=qty,
                    location_id=to_l.id,
                    reason=reason,
                    recorded_by=user.id,
                    created_at=created_time,
                )
            else: # ISSUE
                loc = to_l or main_wh
                mv = StockMovement(
                    item_id=target_item.id,
                    kind=MovementKind.ISSUE,
                    quantity=qty,
                    location_id=loc.id,
                    reason=reason,
                    recorded_by=user.id,
                    created_at=created_time,
                )

            db.add(mv)

        db.commit()
        print(f"Successfully inserted {len(weekly_plan)} historical movements across prior 7 weeks.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding historical movements: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_historical_movements()
