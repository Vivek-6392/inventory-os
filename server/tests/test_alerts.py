"""
Tests for Goal 5: Low-Stock Alerts & Dismiss/Re-trigger
"""
import pytest
from starlette.testclient import TestClient


def _create_item_with_low_stock(client: TestClient, manager_headers: dict) -> dict:
    """Helper: create a category, location, item, then ensure it's below reorder."""
    # Create category
    cat = client.post("/api/categories", json={"name": "AlertTestCat"}, headers=manager_headers).json()

    # Create location
    loc = client.post("/api/locations", json={"name": "AlertTestLoc", "address": "Test"}, headers=manager_headers).json()

    # Create item with reorder_level=50
    item = client.post(
        "/api/items",
        json={
            "sku": "ALT-001",
            "name": "Alert Test Item",
            "unit_of_measure": "pcs",
            "reorder_level": 50,
            "category_id": cat["id"],
        },
        headers=manager_headers,
    ).json()
    assert item.get("id"), f"Item creation failed: {item}"

    # Receipt of 30 (below reorder of 50)
    mv = client.post(
        "/api/movements",
        json={
            "item_id": item["id"],
            "kind": "RECEIPT",
            "quantity": 30,
            "location_id": loc["id"],
        },
        headers=manager_headers,
    ).json()
    assert mv.get("id"), f"Movement creation failed: {mv}"

    return {"item": item, "location": loc, "category": cat}


def test_alerts_list_shows_low_stock_item(client: TestClient, manager_headers: dict):
    """After recording stock below reorder level, the item appears in alerts list."""
    ctx = _create_item_with_low_stock(client, manager_headers)
    item_id = ctx["item"]["id"]

    response = client.get("/api/alerts", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()
    item_ids = [a["item_id"] for a in data]
    assert item_id in item_ids

    # Verify alert fields
    alert = next(a for a in data if a["item_id"] == item_id)
    assert alert["on_hand"] == 30
    assert alert["reorder_level"] == 50
    assert alert["deficit"] == 20
    assert alert["is_dismissed"] == False


def test_alert_count_endpoint(client: TestClient, manager_headers: dict):
    """Count endpoint returns correct number of active alerts."""
    _create_item_with_low_stock(client, manager_headers)

    response = client.get("/api/alerts/count", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert data["count"] >= 1


def test_dismiss_alert_by_manager(client: TestClient, manager_headers: dict, staff_headers: dict):
    """Manager can dismiss a low-stock alert; staff cannot."""
    ctx = _create_item_with_low_stock(client, manager_headers)
    item_id = ctx["item"]["id"]

    # Staff cannot dismiss
    staff_resp = client.post(f"/api/alerts/{item_id}/dismiss", headers=staff_headers)
    assert staff_resp.status_code == 403

    # Manager can dismiss
    resp = client.post(f"/api/alerts/{item_id}/dismiss", headers=manager_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["is_dismissed"] == True
    assert data["dismissed_by_name"] is not None
    assert data["dismissed_at"] is not None

    # Alert no longer appears in default list
    list_resp = client.get("/api/alerts", headers=manager_headers)
    active_ids = [a["item_id"] for a in list_resp.json()]
    assert item_id not in active_ids

    # But appears in /all (manager view with dismissed)
    all_resp = client.get("/api/alerts/all", headers=manager_headers)
    all_ids = [a["item_id"] for a in all_resp.json()]
    assert item_id in all_ids


def test_alert_retrigger_on_movement_above_reorder(client: TestClient, manager_headers: dict):
    """
    After dismissal, if a receipt raises on_hand above reorder, re-trigger resets is_dismissed=False.
    """
    ctx = _create_item_with_low_stock(client, manager_headers)
    item_id = ctx["item"]["id"]
    loc_id = ctx["location"]["id"]

    # Dismiss the alert
    dismiss_resp = client.post(f"/api/alerts/{item_id}/dismiss", headers=manager_headers)
    assert dismiss_resp.status_code == 200

    # Confirm dismissed
    list_resp = client.get("/api/alerts", headers=manager_headers)
    active_ids = [a["item_id"] for a in list_resp.json()]
    assert item_id not in active_ids

    # Receipt that pushes on_hand (30 + 30 = 60) above reorder level (50)
    mv = client.post(
        "/api/movements",
        json={
            "item_id": item_id,
            "kind": "RECEIPT",
            "quantity": 30,
            "location_id": loc_id,
        },
        headers=manager_headers,
    )
    assert mv.status_code == 201

    # Alert should now be re-triggered (is_dismissed reset to False)
    # But since on_hand=60 > reorder=50, item no longer shows as low-stock at all
    all_resp = client.get("/api/alerts/all", headers=manager_headers)
    all_ids = [a["item_id"] for a in all_resp.json()]
    # Item should NOT appear because it's now above reorder
    assert item_id not in all_ids


def test_dismiss_non_low_stock_item_fails(client: TestClient, manager_headers: dict):
    """Cannot dismiss an alert for an item that is NOT below reorder level."""
    cat = client.post("/api/categories", json={"name": "OKCat"}, headers=manager_headers).json()
    loc = client.post("/api/locations", json={"name": "OKLoc", "address": "OK"}, headers=manager_headers).json()
    item = client.post(
        "/api/items",
        json={"sku": "OK-001", "name": "OK Stock Item", "unit_of_measure": "pcs", "reorder_level": 10, "category_id": cat["id"]},
        headers=manager_headers,
    ).json()

    # Receipt plenty of stock (above reorder of 10)
    client.post(
        "/api/movements",
        json={"item_id": item["id"], "kind": "RECEIPT", "quantity": 100, "location_id": loc["id"]},
        headers=manager_headers,
    )

    # Try to dismiss — should fail because on_hand > reorder_level
    resp = client.post(f"/api/alerts/{item['id']}/dismiss", headers=manager_headers)
    assert resp.status_code == 400


def test_alerts_unauthorized(client: TestClient):
    """Unauthenticated request to alerts returns 401."""
    resp = client.get("/api/alerts")
    assert resp.status_code == 401
