import pytest
from starlette.testclient import TestClient


def test_get_dashboard_stats_success(client: TestClient, staff_headers: dict):
    response = client.get("/api/dashboard/stats", headers=staff_headers)

    assert response.status_code == 200, response.text
    data = response.json()

    # Core metrics
    assert "total_items" in data
    assert "archived_items" in data
    assert "total_stock_units" in data
    assert "low_stock_count" in data
    assert "total_locations" in data
    assert "total_movements" in data

    assert data["total_items"] >= 0
    assert data["total_stock_units"] >= 0

    # Distributions
    assert "category_distribution" in data
    assert isinstance(data["category_distribution"], list)

    assert "location_distribution" in data
    assert isinstance(data["location_distribution"], list)

    # Activity & trends
    assert "low_stock_items" in data
    assert isinstance(data["low_stock_items"], list)

    assert "recent_movements" in data
    assert isinstance(data["recent_movements"], list)

    assert "movement_trends" in data
    assert len(data["movement_trends"]) == 14
    for day in data["movement_trends"]:
        assert "date" in day
        assert "receipts" in day
        assert "issues" in day
        assert "transfers" in day
        assert "adjustments" in day


def test_get_dashboard_stats_unauthorized(client: TestClient):
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 401
