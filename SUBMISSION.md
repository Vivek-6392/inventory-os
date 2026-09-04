# Submission

## Links

- **GitHub repository:** https://github.com/Vivek-6392/inventory-os
- **Live application (Frontend UI):** https://inventory-os.vercel.app
- **Live API Server (Backend):** https://inventory-api-u0wx.onrender.com (API Swagger Docs: https://inventory-api-u0wx.onrender.com/docs)

---

## Notes for the Reviewer

Welcome to **InventoryOS**! The application comes pre-configured with a seed script that populates realistic demo data including catalog products, locations, user accounts with staff location assignments, movements, and initial alert states.

### Quick Start in Under 2 Minutes:

1. **Backend Server**:
   ```bash
   cd server
   python -m venv venv
   # On Windows: venv\Scripts\activate | On macOS/Linux: source venv/bin/activate
   pip install -r requirements.txt
   python -m app.seed
   uvicorn app.main:app --reload --port 8000
   ```
2. **Frontend Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Running the Automated Test Suite**:
   ```bash
   cd server
   pytest -v
   # All 29 automated test suites will run and pass in ~19 seconds.
   ```

---

## Demo Credentials

| Role | Name | Email | Password | Permissions & Location Assignments |
|---|---|---|---|---|
| **Manager** | **Aarav Sharma** | `manager@invstock.com` | `manager123` | Full unrestricted access: create/edit items, manage categories & locations, onboard new staff accounts, assign staff to locations, dismiss low-stock alerts, bulk CSV imports. |
| **Warehouse Staff 1** | **Rohan Verma** | `staff1@invstock.com` | `staff123` | Operational access: record receipts, issues, and transfers strictly for assigned locations (`Main Warehouse`, `Retail Floor A`, `North Distribution Center`). Blocked from unassigned locations. |
| **Warehouse Staff 2** | **Ananya Iyer** | `staff2@invstock.com` | `staff123` | Operational access: record receipts, issues, and transfers strictly for assigned locations (`Retail Floor B`, `South Fulfillment Hub`, `West Logistics Depot`). Blocked from unassigned locations. |

---

## Technology Stack

| Layer | What we used | Why |
|---|---|---|
| **Frontend** | React 19, TypeScript, Material UI (MUI v6), Recharts, Vite | Modern component architecture, full static type safety, accessible design system with built-in dark/light theme switching, and interactive volume charts. |
| **Backend** | Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2 | High performance asynchronous REST API, strict request/response data contracts, automatic OpenAPI/Swagger documentation, and clean service-layer isolation. |
| **Database** | SQLite (development/tests) & PostgreSQL (production) | SQLite enables instant zero-configuration local runs and rapid automated test execution; PostgreSQL provides enterprise ACID guarantees in production. |
| **Security** | OAuth2 Password Bearer, JWT (HMAC-SHA256), Passlib (Bcrypt) | Stateless, industry-standard authentication with granular role-based route middleware. |

---

## Goal Checklist

| # | Goal | Status | Notes |
|---|---|---|---|
| **1** | Items & Categories | **Done** | Complete CRUD, unique uppercase SKU enforcement, category management, soft delete (archive/restore) preserving historical stock. |
| **2** | Multi-Location Inventory | **Done** | Location management, staff location assignments, prevents deleting locations with movement history. |
| **3** | Append-Only Movement Ledger | **Done** | `RECEIPT`, `ISSUE`, `TRANSFER`, and `ADJUSTMENT`. Non-negative stock enforced, adjustment reasons required, transfers strictly indivisible. |
| **4** | Stock History & Audit Log | **Done** | Full transaction timeline, filterable by date, movement kind, and location, with pagination and item notes. |
| **5** | Access Control & Staff Location RBAC | **Done** | Distinct Manager vs Staff roles. Staff are restricted to recording movements at assigned locations; unassigned locations disabled in UI. |
| **6** | Modern Frontend Experience | **Done** | Responsive layout, light/dark mode theme engine, custom glassmorphic cards, live stock badges, and rich dialogs. |
| **7** | Bulk CSV Import & Export | **Done** | Per-row savepoints (`db.begin_nested()`) reporting line-by-line errors for product catalog and bulk receipts. Real-time multi-location stock position CSV export. |
| **8** | Low-Stock Alerts & Dismissal | **Done** | Real-time threshold evaluation, manager dismissal/undismissal, write-time auto re-triggering when stock rises above reorder level, live navigation badge. |
| **9** | Dashboard & Analytics | **Done** | Headline KPI cards (movements today, distinct items moved this week), 14-day daily volume area chart, 8-week weekly volume bar chart, category and location stock distributions. |
| **10** | Documentation & Quality Verification | **Done** | Complete docs (`architecture.md`, `schema.md`, `decisions.md`, `plan.md`, `ai-prompts.md`, `SUBMISSION.md`) and 29 passing automated tests. |

---

## How much time did you actually spend?

Approximately **16 hours** in total across 10 structured pairing sessions, distributed between domain architecture, backend service implementation, test coverage, frontend UI polish, and technical documentation.

---

## What would you do next, with another 12 hours?

1. **Scheduled Stock Snapshot Generation**:
   - For catalogs exceeding 500,000 items, build an automated nightly job that compiles stock snapshot checkpoints. This allows on-hand calculations to start from the latest checkpoint rather than scanning the entire historical movement table from inception.
2. **Batch / Serial Number & Expiration Date Tracking**:
   - Extend `StockMovement` to support optional batch/lot numbers and expiration dates for perishable or medical inventory, including First-Expired, First-Out (FEFO) picking suggestions.
3. **Automated Reorder PO Generation & Supplier Webhooks**:
   - Provide an option for managers to automatically draft supplier purchase orders or dispatch outbound webhooks to vendors whenever an item reaches its reorder threshold.

---

## What are you least happy with in this codebase, and why?

**Dynamic Stock Aggregation on Large Catalogs Without Materialized Views**:
While deriving current on-hand stock entirely on-the-fly from the append-only ledger provides supreme data integrity and zero sync drift, running full aggregations across all movements for multi-page lists or large CSV exports will experience query latency as movement rows scale into the tens of millions. 

In the future, introducing a PostgreSQL Materialized View or an automated balance snapshot table would preserve the pure ledger architecture while providing constant $O(1)$ read performance for company-wide stock reports.
