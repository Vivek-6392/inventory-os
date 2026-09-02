from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, categories, items, movements, locations, users, history, csv_tools, dashboard, alerts

app = FastAPI(
    title="Inventory & Stock Control API",
    description="Append-only ledger-based inventory management system",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
