import csv
import io
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Item, Category, Location, StockMovement, MovementKind, ItemHistory, AlertState, User
from app.schemas.item import ImportResult
from app.middleware.auth import require_manager, require_any
from app.services.stock_service import get_all_items_stock_summary

router = APIRouter(prefix="/api/items", tags=["import-export"])


@router.post("/import-csv", response_model=ImportResult)
async def import_items_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """
    Goal 4: Managers can upload a CSV to create items in bulk.
    Expected CSV columns:
    sku,name,description,category,unit_of_measure,reorder_level,initial_stock,initial_location

    Valid rows succeed, invalid rows fail with explicit row-level error reporting.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .csv file",
        )

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")  # handles potential UTF-8 BOM
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode CSV file. Please upload a UTF-8 encoded CSV.",
            )

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file appears to be empty or has no headers.",
        )

    # Normalize fieldnames to lowercase trimmed
    fieldnames = [f.strip().lower() for f in reader.fieldnames if f]
    required_fields = {"sku", "name", "unit_of_measure", "reorder_level"}
    missing = required_fields - set(fieldnames)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV missing required columns: {', '.join(missing)}. Required: sku, name, unit_of_measure, reorder_level",
        )

    # Pre-fetch existing categories, locations, and SKUs to speed up bulk validation
    existing_categories = {c.name.lower(): c for c in db.query(Category).all()}
    existing_locations = {l.name.lower(): l for l in db.query(Location).all()}
    existing_skus = {i.sku.upper() for i in db.query(Item.sku).all()}

    imported_count = 0
    failed_count = 0
    errors_list = []

    seen_skus_in_batch = set()

    rows = list(reader)
    for idx, raw_row in enumerate(rows, start=2):  # Line 2 corresponds to first data row
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
        row_errors = []

        # Validate SKU
        sku = row.get("sku", "").upper()
        if not sku:
            row_errors.append("SKU is required")
        elif sku in existing_skus:
            row_errors.append(f"SKU '{sku}' already exists in database")
        elif sku in seen_skus_in_batch:
            row_errors.append(f"Duplicate SKU '{sku}' within CSV file")

        # Validate Name
        name = row.get("name", "")
        if not name:
            row_errors.append("Item name is required")

        # Validate Unit of measure
        uom = row.get("unit_of_measure", "")
        if not uom:
            row_errors.append("unit_of_measure is required")

        # Validate Reorder Level
        reorder_str = row.get("reorder_level", "0")
        try:
            reorder_level = int(reorder_str)
            if reorder_level < 0:
                row_errors.append("reorder_level must be >= 0")
        except ValueError:
            row_errors.append(f"Invalid reorder_level '{reorder_str}': must be an integer")
            reorder_level = 0

        # Validate / Resolve Category
        cat_name = row.get("category", "")
        category_obj = None
        if cat_name:
            cat_lower = cat_name.lower()
            if cat_lower in existing_categories:
                category_obj = existing_categories[cat_lower]
            else:
                category_obj = Category(name=cat_name)
                db.add(category_obj)
                db.flush()
                existing_categories[cat_lower] = category_obj

        # Validate Initial Stock & Initial Location
        initial_stock_str = row.get("initial_stock", "0")
        initial_stock = 0
        if initial_stock_str:
            try:
                initial_stock = int(initial_stock_str)
                if initial_stock < 0:
                    row_errors.append("initial_stock cannot be negative")
            except ValueError:
                row_errors.append(f"Invalid initial_stock '{initial_stock_str}': must be an integer")

        loc_name = row.get("initial_location", "")
        location_obj = None
        if initial_stock > 0:
            if not loc_name:
                row_errors.append(f"initial_location is required when initial_stock is > 0 ({initial_stock})")
            else:
                loc_lower = loc_name.lower()
                if loc_lower in existing_locations:
                    location_obj = existing_locations[loc_lower]
                else:
                    location_obj = Location(name=loc_name)
                    db.add(location_obj)
                    db.flush()
                    existing_locations[loc_lower] = location_obj

        if row_errors:
            failed_count += 1
            errors_list.append({"row": idx, "errors": row_errors})
            continue

        # If valid, create item
        desc = row.get("description", "")
        item = Item(
            sku=sku,
            name=name,
            description=desc if desc else None,
            unit_of_measure=uom,
            reorder_level=reorder_level,
            category_id=category_obj.id if category_obj else None,
        )
        db.add(item)
        db.flush()

        seen_skus_in_batch.add(sku)
        existing_skus.add(sku)

        # Record history for creation
        db.add(
            ItemHistory(
                item_id=item.id,
                action="CREATED",
                note="Created via bulk CSV import",
                changed_by=current_user.id,
            )
        )

        # Initialize alert state
        db.add(AlertState(item_id=item.id, is_dismissed=False))

        # If initial stock provided, record initial receipt movement
        if initial_stock > 0 and location_obj:
            movement = StockMovement(
                item_id=item.id,
                kind=MovementKind.RECEIPT,
                quantity=initial_stock,
                location_id=location_obj.id,
                reason="Initial inventory balance from CSV import",
                recorded_by=current_user.id,
            )
            db.add(movement)

        imported_count += 1

    db.commit()

    return ImportResult(
        imported=imported_count,
        failed=failed_count,
        errors=errors_list,
    )


@router.get("/export-csv")
def export_stock_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any),
):
    """
    Goal 7: Export full stock position report as a downloadable CSV.
    """
    summary = get_all_items_stock_summary(db)
    locations = db.query(Location).order_by(Location.name.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    header = [
        "SKU",
        "Item Name",
        "Description",
        "Category",
        "Unit of Measure",
        "Reorder Level",
        "Total On Hand",
        "Below Reorder",
        "Archived",
    ]
    for loc in locations:
        header.append(f"Stock @ {loc.name}")
    writer.writerow(header)

    # Data rows
    for row in summary:
        sku = row["item"].sku
        name = row["item"].name
        desc = row["item"].description or ""
        cat = row["item"].category.name if row["item"].category else ""
        uom = row["item"].unit_of_measure
        reorder = row["item"].reorder_level
        on_hand = row["on_hand"]
        below_reorder = "YES" if on_hand <= reorder else "NO"
        archived = "YES" if row["item"].archived else "NO"

        data_row = [
            sku,
            name,
            desc,
            cat,
            uom,
            reorder,
            on_hand,
            below_reorder,
            archived,
        ]

        # Location stock breakdown
        loc_breakdown = row.get("stock_by_location", {})
        for loc in locations:
            data_row.append(loc_breakdown.get(loc.id, 0))

        writer.writerow(data_row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=stock_position_report.csv"},
    )
