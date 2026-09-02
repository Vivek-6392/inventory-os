from datetime import datetime, timedelta, timezone
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.models import Item, Category, Location, StockMovement, MovementKind, User, AlertState
from app.schemas.dashboard import (
    DashboardStatsOut,
    CategoryStockDistribution,
    LocationStockDistribution,
    LowStockItemSummary,
    RecentMovementSummary,
    MovementTrendDay,
    MovementTrendWeek,
)
from app.middleware.auth import require_any
from app.services.stock_service import get_all_items_stock_summary, get_item_total_on_hand

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# Alerts count stub (full implementation in Session 8)
# ---------------------------------------------------------------------------

@router.get("/alerts-count")
def get_alerts_count_stub(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Stub endpoint: count active (non-dismissed) items below their reorder level.
    Full alert management (dismiss/re-trigger) will be built in Session 8.
    Uses the alert_state table: items where is_dismissed=False AND on_hand <= reorder_level.
    """
    items = db.query(Item).filter(Item.archived == False).all()
    count = 0
    for item in items:
        on_hand = get_item_total_on_hand(db, item.id)
        if on_hand <= item.reorder_level:
            # Check if dismissed
            state = db.query(AlertState).filter(AlertState.item_id == item.id).first()
            if state is None or not state.is_dismissed:
                count += 1
    return {"count": count}



@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 6: Retrieve aggregated KPI metrics, visual chart distributions, and activity trends.
    """
    # 1. Base counts
    total_items = db.query(Item).filter(Item.archived == False).count()
    archived_items = db.query(Item).filter(Item.archived == True).count()
    total_locations = db.query(Location).count()
    total_movements = db.query(StockMovement).count()

    # 2. Stock summary across all items and locations
    stock_summaries = get_all_items_stock_summary(db)
    locations = db.query(Location).order_by(Location.name.asc()).all()
    categories = db.query(Category).all()

    total_stock_units = 0
    low_stock_items_list = []
    category_stock_map: Dict[str, Dict] = {
        "Uncategorized": {"id": None, "count": 0, "stock": 0}
    }
    for c in categories:
        category_stock_map[c.name] = {"id": c.id, "count": 0, "stock": 0}

    location_stock_map: Dict[str, Dict] = {
        str(loc.id): {"name": loc.name, "stock": 0} for loc in locations
    }

    for row in stock_summaries:
        item: Item = row["item"]
        on_hand: int = row["on_hand"]

        if not item.archived:
            total_stock_units += on_hand

            # Category aggregation
            cat_name = item.category.name if item.category else "Uncategorized"
            if cat_name not in category_stock_map:
                category_stock_map[cat_name] = {"id": item.category_id, "count": 0, "stock": 0}
            category_stock_map[cat_name]["count"] += 1
            category_stock_map[cat_name]["stock"] += on_hand

            # Low stock detection
            if on_hand <= item.reorder_level:
                low_stock_items_list.append(
                    LowStockItemSummary(
                        item_id=item.id,
                        sku=item.sku,
                        name=item.name,
                        category_name=item.category.name if item.category else None,
                        unit_of_measure=item.unit_of_measure,
                        reorder_level=item.reorder_level,
                        on_hand=on_hand,
                        deficit=max(0, item.reorder_level - on_hand),
                    )
                )

        # Location aggregation
        loc_breakdown = row.get("stock_by_location", {})
        for loc_id_key, qty in loc_breakdown.items():
            if str(loc_id_key) in location_stock_map:
                location_stock_map[str(loc_id_key)]["stock"] += qty

    # Sort low stock items by deficit descending
    low_stock_items_list.sort(key=lambda x: (x.deficit, x.reorder_level), reverse=True)

    # Location movement counts
    location_movement_counts = (
        db.query(StockMovement.location_id, func.count(StockMovement.id))
        .group_by(StockMovement.location_id)
        .all()
    )
    movement_count_dict = {str(loc_id): count for loc_id, count in location_movement_counts if loc_id}

    location_distribution = []
    for loc in locations:
        loc_id_str = str(loc.id)
        loc_data = location_stock_map.get(loc_id_str, {"stock": 0})
        location_distribution.append(
            LocationStockDistribution(
                location_id=loc.id,
                location_name=loc.name,
                total_stock=loc_data["stock"],
                movement_count=movement_count_dict.get(loc_id_str, 0),
            )
        )

    category_distribution = []
    for name, data in category_stock_map.items():
        if data["count"] > 0 or data["stock"] > 0:
            category_distribution.append(
                CategoryStockDistribution(
                    category_id=data["id"],
                    category_name=name,
                    item_count=data["count"],
                    total_stock=data["stock"],
                )
            )

    # 3. Recent 10 movements with full details
    recent_db_movements = (
        db.query(StockMovement)
        .order_by(desc(StockMovement.created_at))
        .limit(10)
        .all()
    )
    recent_movements = []
    for m in recent_db_movements:
        recent_movements.append(
            RecentMovementSummary(
                id=m.id,
                item_name=m.item.name if m.item else "Unknown Item",
                item_sku=m.item.sku if m.item else "N/A",
                kind=m.kind.value,
                quantity=m.quantity,
                location_name=m.location.name if m.location else None,
                from_location_name=m.from_location.name if m.from_location else None,
                to_location_name=m.to_location.name if m.to_location else None,
                reason=m.reason,
                user_name=m.recorder.name if m.recorder else "System",
                created_at=m.created_at,
            )
        )

    # 4. Movements today and distinct items moved this week (Indian Standard Time: UTC+05:30)
    ist = timezone(timedelta(hours=5, minutes=30), name="IST")
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(ist)
    today_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_ist.astimezone(timezone.utc)

    movements_today = db.query(StockMovement).filter(StockMovement.created_at >= today_start_utc).count()

    seven_days_ago = now_utc - timedelta(days=7)
    distinct_items_moved_this_week = (
        db.query(StockMovement.item_id)
        .filter(StockMovement.created_at >= seven_days_ago)
        .distinct()
        .count()
    )

    # 5. 14-day daily movement volume trends (in IST)
    daily_trends_map = {}
    for i in range(13, -1, -1):
        day_date = (now_ist - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_trends_map[day_date] = {
            "receipts": 0,
            "issues": 0,
            "transfers": 0,
            "adjustments": 0,
        }

    fourteen_days_ago_utc = now_utc - timedelta(days=14)
    trend_movements = (
        db.query(StockMovement)
        .filter(StockMovement.created_at >= fourteen_days_ago_utc)
        .all()
    )
    for tm in trend_movements:
        tm_dt = tm.created_at if tm.created_at.tzinfo else tm.created_at.replace(tzinfo=timezone.utc)
        d_str = tm_dt.astimezone(ist).strftime("%Y-%m-%d")
        if d_str in daily_trends_map:
            if tm.kind == MovementKind.RECEIPT:
                daily_trends_map[d_str]["receipts"] += tm.quantity
            elif tm.kind == MovementKind.ISSUE:
                daily_trends_map[d_str]["issues"] += tm.quantity
            elif tm.kind == MovementKind.TRANSFER:
                daily_trends_map[d_str]["transfers"] += tm.quantity
            elif tm.kind == MovementKind.ADJUSTMENT:
                daily_trends_map[d_str]["adjustments"] += abs(tm.quantity)

    movement_trends = [
        MovementTrendDay(
            date=d,
            receipts=counts["receipts"],
            issues=counts["issues"],
            transfers=counts["transfers"],
            adjustments=counts["adjustments"],
        )
        for d, counts in daily_trends_map.items()
    ]

    # 6. 8-Week Receipt and Issue Volume Trends (Goal 8 specification in IST)
    eight_weeks_ago_utc = now_utc - timedelta(weeks=8)
    eight_weeks_movements = (
        db.query(StockMovement)
        .filter(StockMovement.created_at >= eight_weeks_ago_utc)
        .all()
    )
    weekly_movement_trends = []
    for w in range(7, -1, -1):
        w_start = now_ist - timedelta(weeks=w + 1)
        w_end = now_ist - timedelta(weeks=w)
        label = f"Wk {8 - w} ({w_start.strftime('%b %d')})"
        w_receipts = 0
        w_issues = 0
        w_transfers = 0
        w_adjustments = 0
        for m in eight_weeks_movements:
            m_dt = m.created_at if m.created_at.tzinfo else m.created_at.replace(tzinfo=timezone.utc)
            m_ist = m_dt.astimezone(ist)
            if w_start <= m_ist < w_end:
                if m.kind == MovementKind.RECEIPT:
                    w_receipts += m.quantity
                elif m.kind == MovementKind.ISSUE:
                    w_issues += m.quantity
                elif m.kind == MovementKind.TRANSFER:
                    w_transfers += m.quantity
                elif m.kind == MovementKind.ADJUSTMENT:
                    w_adjustments += abs(m.quantity)
        weekly_movement_trends.append(
            MovementTrendWeek(
                week_label=label,
                receipts=w_receipts,
                issues=w_issues,
                transfers=w_transfers,
                adjustments=w_adjustments,
            )
        )

    return DashboardStatsOut(
        total_items=total_items,
        archived_items=archived_items,
        total_stock_units=total_stock_units,
        low_stock_count=len(low_stock_items_list),
        total_locations=total_locations,
        total_movements=total_movements,
        movements_today=movements_today,
        distinct_items_moved_this_week=distinct_items_moved_this_week,
        category_distribution=category_distribution,
        location_distribution=location_distribution,
        low_stock_items=low_stock_items_list[:10],
        recent_movements=recent_movements,
        movement_trends=movement_trends,
        weekly_movement_trends=weekly_movement_trends,
    )
