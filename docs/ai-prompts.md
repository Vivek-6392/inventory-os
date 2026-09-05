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

---

## 7. Facility Inspection Drawer UI & Authorized Personnel Rendering

### Prompt
> "Fix the Locations page facility inspection drawer UI. BUG: The drawer correctly shows: 'Authorized Personnel (2)' and the Edit Roster button, but the actual authorized personnel rows are not visible. The space below the heading appears empty/blank. Do not change backend/API/models. Make the smallest clean frontend/UI fix necessary."

### What was received
- Suggested inspecting `inspectLocation.assigned_staff` mappings and adding fallback text or debugging height properties.

### What went wrong (Encountered CSS Flexbox Collapse Bug)
- The drawer parent container was configured with `display: flex`, `flexDirection: column`, `height: 100%`, `overflowY: auto`.
- The quick actions footer at the bottom of the drawer was assigned `mt: 'auto'`, while the personnel list container was given `maxHeight: 300px` without a rigid flex-basis or growth factor.
- Under MUI's flexbox computation, `mt: 'auto'` pushed the footer down aggressively, collapsing the scrollable personnel list container down to `0px` rendered height. The elements were physically in the DOM, but completely squashed and invisible.
- Additionally, the top KPI card "Total Staff Assigned: 8" counted non-unique assignments across multiple locations rather than distinct staff members.

### What was corrected
- Refactored the drawer layout in `LocationsPage.tsx` from flex-shrink layout to `display: 'block'` with natural vertical flow and consistent margins, ensuring personnel cards render reliably regardless of screen height.
- Corrected total staff assigned calculation to compute `new Set(locations.flatMap(l => l.assigned_staff?.map(s => s.id) ?? [])).size` for unique personnel representation.

---

## 8. Full-Width Responsive Dashboard CSS Grid Redesign

### Prompt
> "Redesign the dashboard layout so the cards use the full available page width and eliminate the large empty space on the right. Make the container 100% of the available viewport width with consistent padding. Desktop layout: Row 1: 8-Week Movement Volume Trends (~60%) + Stock by Category (~40%). Row 2: Stock by Location (~40%) + Low Stock Watchlist (~60%). Both rows should span the entire width with a 16-24px gap."

### What was received
- A responsive layout using MUI `Grid` containers with `xs={12} md={7}` and `xs={12} md={5}`.

### What went wrong (Grid Whitespace Gap Bug)
- MUI Grid containers with 12-column integer spans (`7/12` = 58.33%, `5/12` = 41.67%) calculate fractional percentages that leave residual gutters on ultra-wide viewports (1440px+), producing visual whitespace imbalances on the right edge.
- Furthermore, when the warehouse had zero items below reorder level, the Low Stock Watchlist appeared completely empty and unbalanced next to the Stock by Location chart.

### What was corrected
- Replaced MUI `Grid` with native CSS Grid (`display: 'grid'`, `gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }` for Row 1, and `gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' }` for Row 2) spanning `width: '100%'`.
- When stock is healthy and zero alerts exist, added a positive status banner accompanied by three clickable mini insight cards (Top Category, Top Location, Moved This Week) to maintain balanced card heights across both columns.

---

## 9. Item Detail Location Cards Uniform Grid (4 Per Row)

### Prompt
> "fix this make all cards of same size and in one row 4 cards" (with attached screenshot of Item Detail Page 'Stock Breakdown by Location' section)

### What was received
- Identified that in `ItemDetailPage.tsx`, the 'Stock Breakdown by Location' cards used `@mui/material/Grid` with `item xs={12} sm={6} md={4}`.
- In MUI modern versions (`@mui/material` v9+), the Grid component behaves as Grid v2 where `item`, `xs`, and `md` props are superseded by `size={{ ... }}`. Consequently, the cards fell back to unconstrained flex items without fixed fractional widths, causing card widths to vary unevenly according to description text length (e.g. "Retail Floor A" was 140px wide while "Quarantine & Returns Depot" was 310px wide).

### What was corrected
- Replaced the flex/MUI Grid container with a native CSS Grid container:
  ```tsx
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, 1fr)',
    md: 'repeat(4, 1fr)',
  },
  gap: 2
  ```
- Styled each location card `Paper` with `height: '100%'`, `display: 'flex'`, `flexDirection: 'column'`, `justifyContent: 'space-between'`.
- Enforced a uniform height for the text area (`minHeight: '2.7em'`, 2-line clamp with ellipsis) so that 1-line and 2-line location descriptions take up identical vertical space.
- Result: Every card in the grid has the exact same width and height, cleanly organized in 4 cards per row across desktop displays.



