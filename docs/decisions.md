# Decisions

Log of the pivotal design and technical decisions that shaped this codebase where meaningful alternatives existed.

---

## Decision 1: Append-Only Movement Ledger vs. Mutable Item Balance

- **Chose:** A strictly append-only `StockMovement` ledger table from which all current and location-specific on-hand balances are derived dynamically.
- **Rejected:** Storing a mutable `quantity_on_hand` integer column on the `Item` or `ItemLocation` table updated via incremental `UPDATE` queries.
- **Why:** In real-world inventory control, a mutable balance column is susceptible to silent concurrency race conditions, deadlocks under load, and gradual drift between physical counts and transaction logs. Deriving stock directly from the ledger guarantees complete auditability, makes audit backtracking trivial, and ensures financial compliance where every item unit has a verifiable lineage.

---

## Decision 2: Single Indivisible Row for Transfers vs. Paired Issue/Receipt Rows

- **Chose:** Modeling stock transfers as a single `StockMovement` record with `kind = TRANSFER`, `from_location_id`, and `to_location_id`.
- **Rejected:** Inserting two separate movement rows (an `ISSUE` from the origin location and a `RECEIPT` into the destination location linked by a shared batch or correlation ID).
- **Why:** Generating paired rows introduces the risk of orphan states (e.g., source decremented but destination creation fails) or dual-counting errors if complex queries sum receipts without filtering transfer flags. A single transfer row is atomic by definition, guarantees that company-wide stock remains unchanged, and naturally displays in audit logs as a clear point-to-point journey.

---

## Decision 3: Write-Time Alert State Re-triggering vs. Background Cron Jobs

- **Chose:** Write-time alert evaluation directly inside `movement_service.py` during movement commits.
- **Rejected:** A periodic background scheduler or cron daemon (e.g., Celery/Redis or APScheduler) polling the database every few minutes to compute stock thresholds.
- **Why:** Background cron pollers introduce infrastructure complexity, operational maintenance overhead, and latency between a delivery and alert clearance. Evaluating the alert state directly during movement creation provides instant zero-latency feedback to users, guarantees consistency with the database transaction, and incurs zero background database CPU usage when the system is idle.

---

## Decision 4: Per-Row Savepoints for Bulk CSV Imports vs. All-or-Nothing Batches

- **Chose:** Processing CSV imports line-by-line using SQLAlchemy transaction savepoints (`db.begin_nested()`) to collect structured row-level errors while committing all valid rows.
- **Rejected:** An all-or-nothing atomic batch transaction where a single validation or database error on row 487 aborts all 500 records.
- **Why:** Warehouse delivery manifests and vendor catalog files frequently contain minor typographical errors (e.g., a missing unit of measure or misspelled category). Rejecting an entire 500-item manifest forces warehouse staff into tedious manual file edits before receiving urgent stock. Per-row savepoints import all valid stock immediately and provide clear line numbers and error messages for the few rows that need correction.

---

## Decision 5: Client-Side vs. Server-Side Item Search & Pagination

- **Chose:** Full server-side pagination, search filtering, and sorting (`/api/items?page=1&page_size=20&search=...&sort_by=...`).
- **Rejected:** Fetching the full inventory array on application boot and performing filtering and pagination entirely in browser memory.
- **Why:** Guarantees sub-100ms response times and predictable memory consumption regardless of catalog size.
- **Later reversed:** In Session 2 (Initial Catalog Setup), we initially implemented client-side filtering and sorting for speed of prototyping, fetching all catalog items in a single GET request. However, once we implemented large bulk CSV imports (Session 7) and dynamic multi-location stock calculation, downloading the entire catalog on every search keystroke began causing noticeable UI lag and stale stock balances. We reversed the initial decision in Session 5 by migrating `/api/items` to server-side SQL `ILIKE` filtering, indexed limit/offset pagination, and unified dynamic stock aggregation.
