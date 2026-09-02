# Architecture

## Moving Pieces & Communication

The system is structured into a modern decoupled client-server architecture with an append-only ledger design for core inventory domain integrity:

1. **Single-Page Application (Frontend - Client)**
   - **Framework**: React 19 with TypeScript, bundled via Vite.
   - **Component Library & Design**: Material UI (MUI v6) with a custom modern design system featuring glassmorphism, responsive navigation drawers, light/dark mode toggling, and rich interactive data visualizations using Recharts.
   - **State & Communication**: Axios HTTP client configured with automatic JWT interceptors (`client/src/services/api.ts`). Application authentication state is held in React Context with localStorage persistence. Real-time alert polling updates global badges.

2. **REST API Server (Backend)**
   - **Framework**: Python 3.13 + FastAPI with Pydantic v2 schemas for strict input/output validation.
   - **Authentication & Security**: Stateless OAuth2 password flow issuing HMAC-SHA256 JWT tokens. Passwords hashed using bcrypt. Custom role-based middleware (`require_manager`, `require_staff`, `require_any`) guarding API routes.
   - **Business Domain Layer**: Isolated service layer (`movement_service.py`, `stock_service.py`) enforcing inventory invariants (non-negative stock, atomic transfer ledger entries, staff location permissions, write-time alert state triggers).
   - **Database Access**: SQLAlchemy 2.0 ORM with connection pooling, declarative models, and transactional savepoints for bulk CSV operations.

3. **Database & Storage**
   - **Engine**: PostgreSQL in production / SQLite with foreign key enforcement (`PRAGMA foreign_keys=ON`) for local automated testing.
   - **Design**: Append-only `StockMovement` ledger where on-hand balances are derived dynamically rather than updated via mutable counters.

```
+-------------------------------------------------------------------------------+
|                             Client Browser                                   |
|  [ React 19 + TypeScript + Material UI + Recharts + Axios HTTP Interceptors ] |
+---------------------------------------+---------------------------------------+
                                        |  HTTPS / JSON + Bearer JWT
                                        v
+-------------------------------------------------------------------------------+
|                            FastAPI REST API                                   |
|  [ Auth Router | Items Router | Movements Router | Alerts | Dashboard | CSV ] |
|                                       |                                       |
|                  Domain Services (Movement, Stock, Alert)                     |
+---------------------------------------+---------------------------------------+
                                        |  SQLAlchemy 2.0
                                        v
+-------------------------------------------------------------------------------+
|                            PostgreSQL / SQLite                                |
|  [ users | items | locations | categories | stock_movements | alert_states ]  |
+-------------------------------------------------------------------------------+
```

---

## Where Each Piece Runs

- **Client**: Runs directly in the user's browser (Vite dev server on `http://localhost:5173`, or static build served from `dist/` via Nginx / Cloudflare Pages / Vercel in production).
- **Backend API**: Runs as an asynchronous ASGI process via Uvicorn (`http://localhost:8000`), containerizable via Docker for staging and production deployments.
- **Database**: Runs on PostgreSQL 16 (or local SQLite file `test.db` for zero-dependency local testing and rapid CI test suite execution).

---

## Request Path: End-to-End User Action

### Scenario: Recording an Inventory Issue (Stock Consumption)

1. **User Action (Browser)**:
   - A logged-in warehouse staff member clicks **"Record Stock Movement"** on `/movements`, selects item `SKU-WIDGET-01`, chooses Movement Type `ISSUE`, enters quantity `10`, selects Location `Main Warehouse`, enters Reason `Order fulfillment #9021`, and clicks **Submit**.
2. **Client Validation & HTTP Request**:
   - `RecordMovementDialog.tsx` verifies quantity is positive and that the selected location is in the staff member's assigned locations list.
   - Axios sends:
     ```http
     POST /api/movements
     Authorization: Bearer <jwt_token>
     Content-Type: application/json

     {
       "item_id": "8b94...-uuid",
       "kind": "ISSUE",
       "quantity": 10,
       "location_id": "2c41...-uuid",
       "reason": "Order fulfillment #9021"
     }
     ```
3. **Authentication & Authorization (`require_any` / `movement_service.py`)**:
   - FastAPI parses the Bearer JWT, validates token expiration and signature, and loads the `User` model.
   - The service checks the user's role. If `STAFF`, it queries `staff_locations` to verify the staff member is explicitly assigned to `Main Warehouse`.
4. **Domain Invariant Enforcement**:
   - The system queries all historical movements for `item_id` at `location_id` with `db.begin_nested()` to calculate current location on-hand stock.
   - If current on-hand stock is `8` and the requested issue is `10`, the service immediately raises `HTTPException(400, "Insufficient stock at location. On-hand: 8, requested: 10")` preventing negative stock.
5. **Ledger Commit & Write-Time Side Effects**:
   - Because stock is sufficient, an immutable `StockMovement` row is inserted with `kind = MovementKind.ISSUE`, `quantity = 10`, `recorded_by = user.id`.
   - The alert trigger checks if the company-wide stock fell to or below `item.reorder_level`. If so, any previously dismissed alert state is marked eligible for re-alerting.
   - The transaction commits atomically.
6. **Response & UI Update**:
   - Backend returns `201 Created` with the complete `StockMovementOut` payload.
   - React query / state handler updates the movements table, invalidates stock balances, and triggers a real-time badge refresh on the Alerts header icon.

---

## What We Decided *Not* to Build, and Why

1. **Mutable `current_stock` Column on `Item`**:
   - *Why excluded*: Having a mutable `quantity` or `current_stock` column creates race conditions under concurrent writes, risk of drift between the audit log and current numbers, and destroys financial/audit traceability. Instead, all stock balances are strictly derived from the immutable `stock_movements` ledger.
2. **WebSocket / Socket.IO Real-Time Engine**:
   - *Why excluded*: For a standard inventory management system with tens to hundreds of warehouse workers, WebSocket persistent connections introduce connection state complexity, load balancer stickiness requirements, and reconnection handling overhead. Short polling (every 30 seconds) and optimistic UI updates provide near real-time reactivity with zero infrastructure complexity.
3. **Complex Multi-Tenancy / Distributed microservices**:
   - *Why excluded*: Premature distribution of services across microservices creates distributed transaction headaches (e.g. Saga patterns for stock transfers). A modular monolith with clean service boundaries ensures atomic DB transactions across item, movement, and alert boundaries while remaining easy to deploy and reason about.
