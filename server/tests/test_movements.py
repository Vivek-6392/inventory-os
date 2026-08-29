import pytest
from app.models.models import Location, Item, AlertState


@pytest.fixture
def test_setup(db, manager_user, staff_user):
    # Create two locations
    loc_a = Location(name="Warehouse A", description="Main distribution")
    loc_b = Location(name="Warehouse B", description="Secondary distribution")
    db.add_all([loc_a, loc_b])
    db.flush()

    # Assign staff ONLY to Location A
    staff_user.assigned_locations.append(loc_a)

    # Create active item (reorder level = 20)
    item = Item(
        sku="SKU-LED-001",
        name="LED Light Panel",
        unit_of_measure="pcs",
        reorder_level=20,
        archived=False,
    )
    db.add(item)
    db.flush()

    # Create alert state
    alert = AlertState(item_id=item.id, is_dismissed=False)
    db.add(alert)
    db.commit()

    return {
        "loc_a": loc_a,
        "loc_b": loc_b,
        "item": item,
        "alert": alert,
    }


def test_receipt_and_stock_derivation(client, manager_headers, test_setup):
    loc_a = test_setup["loc_a"]
    item = test_setup["item"]

    # Record receipt of 50 units
    res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 50,
            "location_id": str(loc_a.id),
            "reason": "PO-1001",
        },
        headers=manager_headers,
    )
    assert res.status_code == 201
    assert res.json()["quantity"] == 50
    assert res.json()["kind"] == "RECEIPT"

    # Verify derived total stock is 50
    item_res = client.get(f"/api/items/{item.id}", headers=manager_headers)
    assert item_res.status_code == 200
    assert item_res.json()["on_hand"] == 50
    assert item_res.json()["stock_by_location"][str(loc_a.id)] == 50


def test_issue_refuses_negative_stock(client, manager_headers, test_setup):
    loc_a = test_setup["loc_a"]
    item = test_setup["item"]

    # Initial receipt: 30 units
    client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 30,
            "location_id": str(loc_a.id),
        },
        headers=manager_headers,
    )

    # Attempt to issue 40 units (more than 30 available) -> MUST FAIL 400
    fail_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "ISSUE",
            "quantity": 40,
            "location_id": str(loc_a.id),
        },
        headers=manager_headers,
    )
    assert fail_res.status_code == 400
    assert "Insufficient stock" in fail_res.json()["detail"]

    # Valid issue: 10 units -> SUCCEEDS
    ok_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "ISSUE",
            "quantity": 10,
            "location_id": str(loc_a.id),
        },
        headers=manager_headers,
    )
    assert ok_res.status_code == 201

    # Verify on-hand is now 20
    item_res = client.get(f"/api/items/{item.id}", headers=manager_headers)
    assert item_res.json()["on_hand"] == 20
    assert item_res.json()["stock_by_location"][str(loc_a.id)] == 20


def test_transfer_indivisible_and_negative_check(client, manager_headers, test_setup):
    loc_a = test_setup["loc_a"]
    loc_b = test_setup["loc_b"]
    item = test_setup["item"]

    # Receipt at Loc A: 40 units
    client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 40,
            "location_id": str(loc_a.id),
        },
        headers=manager_headers,
    )

    # Transfer 50 units (exceeds 40) -> MUST FAIL 400
    fail_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "TRANSFER",
            "quantity": 50,
            "from_location_id": str(loc_a.id),
            "to_location_id": str(loc_b.id),
        },
        headers=manager_headers,
    )
    assert fail_res.status_code == 400
    assert "insufficient stock" in fail_res.json()["detail"].lower()

    # Valid transfer of 15 units -> SUCCEEDS
    ok_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "TRANSFER",
            "quantity": 15,
            "from_location_id": str(loc_a.id),
            "to_location_id": str(loc_b.id),
        },
        headers=manager_headers,
    )
    assert ok_res.status_code == 201

    # Verify stock by location: Loc A = 25, Loc B = 15, Total across company = 40
    item_res = client.get(f"/api/items/{item.id}", headers=manager_headers)
    assert item_res.json()["on_hand"] == 40
    assert item_res.json()["stock_by_location"][str(loc_a.id)] == 25
    assert item_res.json()["stock_by_location"][str(loc_b.id)] == 15


def test_adjustment_rules(client, manager_headers, staff_headers, test_setup):
    loc_a = test_setup["loc_a"]
    item = test_setup["item"]

    # 1. Staff cannot record adjustment -> 403
    staff_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "ADJUSTMENT",
            "quantity": 5,
            "location_id": str(loc_a.id),
            "reason": "Found extra box",
        },
        headers=staff_headers,
    )
    assert staff_res.status_code == 403

    # 2. Manager cannot adjust without reason -> 400
    no_reason_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "ADJUSTMENT",
            "quantity": 5,
            "location_id": str(loc_a.id),
            "reason": "",
        },
        headers=manager_headers,
    )
    assert no_reason_res.status_code == 400
    assert "reason is strictly required" in no_reason_res.json()["detail"].lower()

    # 3. Manager provides valid reason -> 201
    ok_adj = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "ADJUSTMENT",
            "quantity": 10,
            "location_id": str(loc_a.id),
            "reason": "Physical cycle count discrepancy audit",
        },
        headers=manager_headers,
    )
    assert ok_adj.status_code == 201


def test_staff_location_permissions(client, staff_headers, test_setup):
    loc_a = test_setup["loc_a"]  # staff assigned
    loc_b = test_setup["loc_b"]  # staff NOT assigned
    item = test_setup["item"]

    # Staff records receipt at assigned Location A -> 201
    ok_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 10,
            "location_id": str(loc_a.id),
        },
        headers=staff_headers,
    )
    assert ok_res.status_code == 201

    # Staff attempts receipt at unassigned Location B -> 403
    fail_res = client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 10,
            "location_id": str(loc_b.id),
        },
        headers=staff_headers,
    )
    assert fail_res.status_code == 403
    assert "not assigned" in fail_res.json()["detail"].lower()


def test_alert_write_time_retrigger(client, manager_headers, db, test_setup):
    loc_a = test_setup["loc_a"]
    item = test_setup["item"]  # reorder_level = 20
    alert = test_setup["alert"]

    # Mark alert as dismissed
    alert.is_dismissed = True
    db.commit()

    # Record receipt of 25 units (> reorder level of 20)
    client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 25,
            "location_id": str(loc_a.id),
        },
        headers=manager_headers,
    )

    # Check alert state: must automatically reset is_dismissed to False
    db.refresh(alert)
    assert alert.is_dismissed is False
