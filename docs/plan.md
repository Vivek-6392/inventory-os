# Development Plan & Execution

## Session Breakdown

The development of InventoryOS was structured into 10 iterative, test-driven sessions mapped directly to the core business objectives:

| Session | Focus Area | Deliverables & Scope |
|---|---|---|
| **Session 1** | Foundation & Authentication | Project directory scaffolding, FastAPI setup, SQLAlchemy schema models, JWT token issue/verify, password hashing, and user registration/login tests. |
| **Session 2** | Catalog Management | Item and Category CRUD endpoints, unique SKU enforcement, soft deletion (archiving/unarchiving), and category management dialogs. |
| **Session 3** | Locations & Staff RBAC | Location CRUD, `staff_locations` join table, user assigned location management, and blocking location deletion when movements exist. |
| **Session 4** | Append-Only Movement Ledger | Implementation of `StockMovement` ledger: `RECEIPT`, `ISSUE`, `TRANSFER`, and `ADJUSTMENT`. Non-negative stock rules, reason validation, and dynamic stock derivation. |
| **Session 5** | Audit Trail & History | Server-side item movement history pagination, filter by movement kind, date ranges, and per-item balance tracking. |
| **Session 6** | Modern Frontend Experience | Vite + React 19 SPA, Material UI customized design system, light/dark mode theme engine, responsive layout drawer, and custom stock badges. |
| **Session 7** | Bulk CSV Import & Export | CSV parser with line-by-line savepoint error collection, stock receipts bulk import, and multi-location stock position CSV export. |
| **Session 8** | Low-Stock Alerts & Dismissal | Alert count endpoint, manager dismissal/undismissal endpoints, write-time auto re-triggering logic, and real-time navigation badge. |
| **Session 9** | Dashboard & Analytics | Headline KPI metric cards (today's movements, distinct items moved this week), 14-day daily volume area charts, 8-week weekly volume bar charts, and category/location distributions. |
| **Session 10** | Polish & Documentation | Edge-case bug auditing, N+1 query elimination, full end-to-end test suite validation (29 automated tests), and comprehensive system documentation. |

---

## Build Ordering & Rationale

We followed an **outside-in, dependency-ordered approach**:
1. **Core Data Models & Auth first**: The authentication and permission primitives (`User`, `Role`) were established first because every subsequent domain operation requires a verified actor.
2. **Catalog & Locations before Movements**: Movements cannot exist without referencing valid items and physical locations.
3. **Movement Ledger before Analytics & Alerts**: Analytics, low-stock alerts, and stock positions are purely derived views of historical movements. Building the ledger first ensured that all downstream calculations had an immutable source of truth to test against.
4. **CSV Import/Export and UI Polish towards the end**: Once the core REST contracts and invariant validation rules were locked in place with passing unit tests, bulk import and rich dashboard visualizations could be layered on with zero ambiguity.

---

## Estimated vs. Actual Time

| Task Area | Estimated Time | Actual Time | Variance & Explanation |
|---|---|---|---|
| Initial Setup & Database Schema | 1.5 hours | 1.5 hours | On track; FastAPI and SQLAlchemy models setup smoothly. |
| Movement Engine & Invariant Rules | 2.5 hours | 3.0 hours | +0.5 hours; extra care was taken to make stock transfers strictly indivisible and handle concurrent stock checks cleanly. |
| React UI & Design System | 3.5 hours | 4.0 hours | +0.5 hours; implementing custom dark/light theme switching, responsive drawer navigation, and rich Recharts visualizations took slightly longer to polish. |
| Bulk CSV Import & Row-level Savepoints | 1.5 hours | 2.0 hours | +0.5 hours; implementing nested savepoints (`db.begin_nested()`) so a single bad row doesn't roll back the whole batch required careful testing. |
| Low-Stock Alerts with Write-Time Re-trigger | 1.5 hours | 1.5 hours | On track; write-time hooks integrated cleanly with the movement service. |
| Analytics & 8-Week Trend Calculations | 1.5 hours | 1.5 hours | On track; standard SQL aggregation queries. |
| Testing, Bug Hunting & Documentation | 2.0 hours | 2.5 hours | +0.5 hours; comprehensive automated test coverage across 29 test suites and complete technical writeups. |
| **Total** | **14.0 hours** | **16.0 hours** | **+2.0 hours total investment for high-polish delivery.** |

---

## What Was Cut When Time Ran Short

1. **Barcode / QR Code Scanner Camera Integration**:
   - *Considered*: Allowing mobile browser cameras to scan 2D barcodes directly in the movement dialog.
   - *Cut rationale*: WebRTC camera stream permissions across disparate browsers and camera resolutions introduce high device variance. We prioritized fast SKU typeahead search and bulk CSV imports, which provide immediate efficiency in warehouse operations.
2. **Automated Purchase Order Generation**:
   - *Considered*: Generating PDF purchase orders automatically when alerts are triggered.
   - *Cut rationale*: Every company has unique ERP/vendor billing formats. Providing a rich CSV stock export and clear alert dashboard gives managers immediate exportability into any existing purchasing tool.
