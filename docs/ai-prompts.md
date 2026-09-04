# AI Collaboration & Prompt History

This document logs the significant prompts used during the development of InventoryOS, grouped by feature objective, detailing what was generated, what errors or omissions were encountered, and how they were corrected.

---

## 1. Domain Modeling & Append-Only Movement Architecture

### Prompt
> "We need to design the database models and service logic for an inventory control system where stock levels are never stored as mutable numbers, but derived strictly from an append-only ledger of movements (RECEIPT, ISSUE, TRANSFER, ADJUSTMENT). Enforce that issues and transfers refuse to let stock drop below zero at any location, and adjustments require a mandatory reason. Provide SQLAlchemy models and FastAPI service logic."

### What was received
- SQLAlchemy models for `Item`, `Category`, `Location`, `User`, and `StockMovement`.
- Service logic calculating available on-hand stock by querying prior movements for `(item_id, location_id)`.
- Rejection of issues/transfers exceeding current stock.

### What was corrected
- **Correction**: The initial code implemented transfers as two separate operations: one negative adjustment and one positive adjustment. We corrected this to model `TRANSFER` as a single indivisible database row with both `from_location_id` and `to_location_id`. This prevented the possibility of half-transfers or duplicated total inventory counts.

---

## 2. Bulk CSV Import with Row-Level Error Reporting

### Prompt
> "Implement bulk CSV import for items and opening stock balances. Requirements: if one row in a 500-item CSV has an invalid SKU or duplicate, it must NOT fail the entire file. Valid rows must be imported, and a per-row error report identifying exact CSV line numbers and error reasons must be returned."

### What was received
- An endpoint parsing CSV files using Python's standard `csv.DictReader`.
- An iteration loop accumulating errors in a list and committing at the end.

### What went wrong (Encountered Bug)
- In the initial implementation, if an exception occurred during row processing (such as a database unique constraint failure or type error), the SQLAlchemy session entered an aborted state (`PendingRollbackError`). Any subsequent attempts to process remaining valid rows threw exceptions, effectively failing all subsequent rows in the batch even if they were valid.
- Additionally, variable scoping for `desc` overlapped between query ordering and row description.

### What was corrected
- We wrapped each CSV row execution in a nested transactional savepoint (`sp = db.begin_nested()`).
- On validation or database error, `sp.rollback()` is executed, isolating the error to that individual row. Valid rows execute `sp.commit()`.
- Added unit tests specifically verifying that a CSV containing 2 valid rows and 3 invalid rows correctly imports exactly 2 items and reports 3 row errors.

---

## 3. Low-Stock Alerts & Write-Time Re-triggering

### Prompt
> "Build the low-stock alerts subsystem. Managers should be able to dismiss an alert for an item whose stock is below its reorder level. If new stock is received and the on-hand quantity rises back above the reorder level, the dismissal must be automatically cleared so that future shortages re-trigger the alert. Staff can view alerts but cannot dismiss them."

### What was received
- `AlertState` model with `item_id`, `is_dismissed`, `dismissed_at`, and `dismissed_by`.
- Endpoints for `GET /api/alerts`, `POST /api/alerts/{id}/dismiss`, and `POST /api/alerts/{id}/undismiss`.
- Hook in `movement_service.py` to reset `is_dismissed = False` when stock climbs above `reorder_level`.

### What went wrong (Performance Bug)
- The initial `GET /api/alerts` implementation iterated through all items in the database and issued a separate `get_item_total_on_hand` database query for every item (an N+1 query problem). With large catalogs, this would cause substantial database latency.

### What was corrected
- Replaced the iterative queries with a single batch-aggregation query `get_multiple_items_stock(db, item_ids)` that groups all movements in one SQL execution.
- Added eager loading for `item.category` and `alert_state.dismissed_by_user`.

---

## 4. Dashboard Headline KPIs & 8-Week Trends

### Prompt
> "Expand the dashboard statistics endpoint to match Goal 8 requirements: add movements today (since 00:00 UTC), distinct items moved this week, and an 8-week weekly volume breakdown comparing receipts vs issues alongside the existing 14-day daily trend."

### What was received
- SQL queries calculating movements recorded since midnight and distinct item IDs moved in the last 7 days.
- Loop computing 8-week time intervals and summing receipt and issue volumes.
- Pydantic schema `MovementTrendWeek`.

### What went wrong (Runtime NameError)
- During automated test execution (`pytest tests/test_dashboard.py`), the test failed with:
  ```
  E NameError: name 'MovementTrendWeek' is not defined
  app\routers\dashboard.py:251: NameError
  ```
- The schema class `MovementTrendWeek` had been added to `schemas/dashboard.py`, but was omitted from the `from app.schemas.dashboard import ...` statement in `routers/dashboard.py`.

### What was corrected
- Added `MovementTrendWeek` to the imports list at the top of `server/app/routers/dashboard.py`.
- Re-ran `pytest tests/test_dashboard.py` and confirmed all assertions passed in 1.07s.

---

## 5. Staff Role-Based Location UX Polish

### Prompt
> "In RecordMovementDialog, make sure staff members only see their assigned locations. If an unassigned location is selected or if they have no locations assigned, show clear warnings and disable submit."

### What was received
- Added `assigned_locations` to the `UserOut` auth response.
- In `RecordMovementDialog.tsx`, filtered the location options to visually indicate assigned vs unassigned locations with helper chips.
- Added an alert banner warning staff members who have not yet been assigned to any location by a manager.

### What was corrected
- Verified that managers retain access to all locations without restriction, ensuring that management capabilities are not hindered by staff permission UI guards.

---

## 6. Staff Onboarding & Facility Assignments by Manager

### Prompt
> "According to the assignment, can we give permission to the manager to onboard new staff members and assign them to facilities? Implement server endpoints and an intuitive UI modal for managers to create warehouse staff accounts with immediate facility assignments, strictly restricted to role STAFF."

### What was received
- A new endpoint `POST /api/users` guarded by `require_manager` to create users with role `STAFF` and associate `location_ids`.
- `StaffCreate` Pydantic schema with email uniqueness verification.
- Frontend dialog `AddStaffDialog` on the `/users` page allowing managers to enter staff details and select facilities via multi-select checkboxes.

### What was corrected
- Explicitly prevented staff creation from accepting or elevating to `MANAGER` role, strictly enforcing that only warehouse staff can be onboarded through this path.
- Added automated test `test_manager_create_staff_and_role_enforcement` verifying that managers can create staff accounts and unauthenticated or staff users are rejected with `401`/`403`.

