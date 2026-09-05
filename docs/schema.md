# Schema & Data Model

## Table-by-Table Schema

### 1. `users`
Represents staff and manager identities authenticated via JWT.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | No | Primary Key |
| `email` | `VARCHAR(255)` | No | Unique index, normalized lowercase |
| `name` | `VARCHAR(100)` | No | Display name |
| `hashed_password` | `VARCHAR(255)` | No | Bcrypt hashed string |
| `role` | `VARCHAR(20)` (Enum) | No | `MANAGER` or `STAFF` |
| `created_at` | `TIMESTAMP WITH TZ` | No | Default `now()` (UTC) |

### 2. `categories`
Hierarchical product grouping.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | No | Primary Key |
| `name` | `VARCHAR(100)` | No | Unique index |
| `description` | `TEXT` | Yes | Optional category description |
| `created_at` | `TIMESTAMP WITH TZ` | No | Default `now()` (UTC) |

### 3. `items`
Catalog master of inventory products.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | No | Primary Key |
| `sku` | `VARCHAR(50)` | No | Unique index, uppercase alphanumeric |
| `name` | `VARCHAR(200)` | No | Item title |
| `description` | `TEXT` | Yes | Notes and technical specifications |
| `category_id` | `VARCHAR(36)` | Yes | Foreign Key -> `categories.id` (`ON DELETE SET NULL`) |
| `unit_of_measure` | `VARCHAR(20)` | No | E.g. `pcs`, `box`, `kg`, `meters` |
| `reorder_level` | `INTEGER` | No | Default `0`, low-stock threshold |
| `archived` | `BOOLEAN` | No | Default `FALSE`, soft deletion flag |
| `created_at` | `TIMESTAMP WITH TZ` | No | Default `now()` (UTC) |
| `updated_at` | `TIMESTAMP WITH TZ` | No | Default `now()` (UTC), updated on edit |

### 4. `locations`
Physical warehouse, depot, or retail storage locations.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | No | Primary Key |
| `name` | `VARCHAR(100)` | No | Unique index |
| `description` | `TEXT` | Yes | Optional location notes |
| `address` | `VARCHAR(255)` | Yes | Street address or geographic location |
| `type` | `VARCHAR(100)` | Yes | Facility kind (e.g., `Warehouse`, `Retail Floor`, `Fulfillment Hub`, `Depot`) |
| `is_active` | `BOOLEAN` | Yes | Operational status flag, default `TRUE` |
| `image_url` | `TEXT` | Yes | Facility photo / visual asset URL |
| `latitude` | `FLOAT` | Yes | Geographic GPS latitude coordinate |
| `longitude` | `FLOAT` | Yes | Geographic GPS longitude coordinate |
| `created_at` | `TIMESTAMP WITH TZ` | No | Default `now()` (UTC) |

### 5. `staff_locations` (Join Table)
Many-to-many relationship mapping warehouse staff to their authorized operational locations.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `user_id` | `VARCHAR(36)` | No | Foreign Key -> `users.id` (`ON DELETE CASCADE`) |
| `location_id` | `VARCHAR(36)` | No | Foreign Key -> `locations.id` (`ON DELETE CASCADE`) |

*Primary Key*: Composite `(user_id, location_id)`.

### 6. `stock_movements` (Immutable Ledger)
Append-only log of every single stock event.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | No | Primary Key |
| `item_id` | `VARCHAR(36)` | No | Foreign Key -> `items.id` (`ON DELETE RESTRICT`) |
| `kind` | `VARCHAR(20)` (Enum) | No | `RECEIPT`, `ISSUE`, `TRANSFER`, `ADJUSTMENT` |
| `quantity` | `INTEGER` | No | Must be `!= 0`. Positive for receipt/issue/transfer; signed for adjustment. |
| `location_id` | `VARCHAR(36)` | Yes | Foreign Key -> `locations.id` (Target location for receipt/issue/adjustment) |
| `from_location_id` | `VARCHAR(36)` | Yes | Foreign Key -> `locations.id` (Source location for transfer) |
| `to_location_id` | `VARCHAR(36)` | Yes | Foreign Key -> `locations.id` (Destination location for transfer) |
| `reason` | `TEXT` | Yes | Mandatory for adjustments; optional for receipts/issues |
| `recorded_by` | `VARCHAR(36)` | No | Foreign Key -> `users.id` (`ON DELETE RESTRICT`) |
| `created_at` | `TIMESTAMP WITH TZ` | No | Default `now()` (UTC), indexed |

### 7. `alert_states`
Tracks manager dismissal state for low-stock threshold alerts.

| Column | Type | Nullable | Constraints & Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | No | Primary Key |
| `item_id` | `VARCHAR(36)` | No | Foreign Key -> `items.id` (`ON DELETE CASCADE`), Unique Index |
| `is_dismissed` | `BOOLEAN` | No | Default `FALSE` |
| `dismissed_at` | `TIMESTAMP WITH TZ` | Yes | When dismissal occurred |
| `dismissed_by` | `VARCHAR(36)` | Yes | Foreign Key -> `users.id` (`ON DELETE SET NULL`) |

---

## Entity Relationships

- **One-to-Many**:
  - `Category (1) -> Items (N)`: An item belongs to at most one category.
  - `Item (1) -> StockMovements (N)`: An item possesses an unbounded historical sequence of movements.
  - `User (1) -> StockMovements (N)`: An audit trail of all movements recorded by each user.
  - `Location (1) -> StockMovements (N)`: Movements associated with a specific location.
- **Many-to-Many**:
  - `Users (M) <-> Locations (N)` via `staff_locations`: Staff members can be assigned to multiple locations, and each location can host multiple staff members.
- **One-to-One (Conditional)**:
  - `Item (1) <-> AlertState (1)`: Each item maintains a single persistent alert state record.

---

## Database vs. Application Constraints

| Invariant / Constraint | Enforced At | Rationale |
|---|---|---|
| **SKU uniqueness** | Database (`UNIQUE INDEX`) | Absolute data integrity guarantee against race conditions in multi-threaded environments. |
| **Email uniqueness** | Database (`UNIQUE INDEX`) | Prevents duplicate user accounts at the physical storage level. |
| **Referential integrity** | Database (`FOREIGN KEY` with `RESTRICT`/`CASCADE`) | Prevents orphaned movements; prevents deletion of items or locations with active movements. |
| **Non-negative stock** | Application Code (with DB transaction) | Calculating available on-hand balance requires aggregating prior ledger entries for that item and location before inserting an `ISSUE` or `TRANSFER`. |
| **Mandatory adjustment reason** | Application Code | Adjustments require a non-empty human justification string explaining shrinkage/damage. |
| **Transfer locations distinctness** | Application Code | `from_location_id != to_location_id` validated before inserting the atomic movement record. |
| **Staff location permissions** | Application Code | Verifies user's active role and membership in `staff_locations` before authorizing write access to a location. |
| **Write-time alert re-triggering** | Application Code | When a receipt or positive adjustment causes total on-hand to exceed `reorder_level`, `alert_states.is_dismissed` is automatically reset to `FALSE`. |

*Why this line was drawn*: Database engines excel at declarative relational integrity (foreign keys, uniqueness, nullability). However, stateful business invariants that depend on multi-row historical derivations (such as preventing negative balances across ledger rows or conditional role-based location permissions) require expressive business logic in the service layer inside atomic database transactions.

---

## Deliberate Denormalisation

1. **Category Name in Export & Summary Views**:
   - The items list and export queries perform an eager join on `categories.name` to avoid N+1 query overhead while keeping the normalized relational structure intact.
2. **Transfer Movements Stored as Single Row with `from_location_id` and `to_location_id`**:
   - Rather than storing two separate debited and credited rows linked by a correlation ID, a `TRANSFER` is stored as a single row with both location IDs. This makes the transfer indivisible and eliminates any chance of "half-transfers" without needing distributed coordination.
3. **No Stored Aggregate On-Hand Counter**:
   - We deliberately chose **not** to denormalize on-hand quantity onto the `items` table. Even though storing `current_stock` on `Item` would make simple reads faster, it introduces dual-write concurrency hazards and synchronization drift. The source of truth is always the ledger.

---

## What Would Break First at 100x Data Scale?

If the dataset scaled by 100x (e.g. 500,000 items and 50,000,000 movements):

1. **Dynamic Full-Table Stock Summaries (`get_all_items_stock_summary`)**:
   - *Failure point*: Running a full `GROUP BY item_id, location_id` over 50 million movement rows on every dashboard load or paginated items list would cause severe query latency (several seconds) and high database CPU load.
   - *Architectural remedy*:
     - Introduce an asynchronous or trigger-maintained **Daily / Hourly Stock Snapshot table** (`item_stock_snapshots(item_id, location_id, date, balance)`).
     - Calculate current stock by taking the latest snapshot plus only movements recorded since that snapshot date.
2. **Dashboard 8-Week Trend Aggregation**:
   - *Failure point*: Scanning millions of movement timestamps dynamically on dashboard requests.
   - *Architectural remedy*: Use PostgreSQL materialized views with periodic refresh (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) or a Redis cache layer for the 6 headline KPI tiles.
3. **CSV Export Streaming Memory**:
   - *Failure point*: Exporting 500,000 items in a single HTTP request would exhaust client-server connection timeouts.
   - *Architectural remedy*: Background job queuing (Celery / RQ) with generation of pre-signed S3/Cloud Storage download links.
