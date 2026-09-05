from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, categories, items, movements, locations, users, history, csv_tools, dashboard, alerts


from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist on startup
    Base.metadata.create_all(bind=engine)
    # Ensure location extension columns exist in database
    with engine.connect() as conn:
        for col_ddl in [
            "ALTER TABLE locations ADD COLUMN IF NOT EXISTS address VARCHAR(255);",
            "ALTER TABLE locations ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'Warehouse';",
            "ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url TEXT;",
            "ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;",
            "ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;",
        ]:
            try:
                conn.execute(text(col_ddl))
                conn.commit()
            except Exception:
                pass
    yield


app = FastAPI(
    title="Inventory & Stock Control API",
    description="Append-only ledger-based inventory management system",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(csv_tools.router)
app.include_router(items.router)
app.include_router(movements.router)
app.include_router(locations.router)
app.include_router(users.router)
app.include_router(history.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {
        "name": "Inventory & Stock Control API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
