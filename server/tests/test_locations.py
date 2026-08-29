from uuid import uuid4
import pytest
from app.models.models import Location, Item


def test_location_crud_and_role_enforcement(client, manager_headers, staff_headers):
    # Manager creates location
    res = client.post(
        "/api/locations",
        json={"name": "North Distribution Center", "description": "High-bay logistics hub"},
        headers=manager_headers,
    )
    assert res.status_code == 201
    loc_id = res.json()["id"]
    assert res.json()["name"] == "North Distribution Center"

    # Staff cannot create location (403)
    staff_create = client.post(
        "/api/locations",
        json={"name": "Forbidden Location"},
        headers=staff_headers,
    )
    assert staff_create.status_code == 403

    # Manager edits location
    edit_res = client.put(
        f"/api/locations/{loc_id}",
        json={"name": "North Logistics Hub", "description": "Updated description"},
        headers=manager_headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["name"] == "North Logistics Hub"

    # Manager deletes empty location
    del_res = client.delete(f"/api/locations/{loc_id}", headers=manager_headers)
    assert del_res.status_code == 204


def test_delete_location_blocked_if_movements_exist(client, manager_headers, db):
    # Create location
    loc = Location(name="Protected Warehouse")
    db.add(loc)
    db.flush()

    item = Item(sku="SKU-LOC-TEST", name="Test Item", unit_of_measure="pcs", reorder_level=5)
    db.add(item)
    db.flush()

    # Record receipt at location
    client.post(
        "/api/movements",
        json={
            "item_id": str(item.id),
            "kind": "RECEIPT",
            "quantity": 10,
            "location_id": str(loc.id),
        },
        headers=manager_headers,
    )

    # Attempt delete -> 400 Bad Request
    del_res = client.delete(f"/api/locations/{loc.id}", headers=manager_headers)
    assert del_res.status_code == 400
    assert "Cannot delete location" in del_res.json()["detail"]


def test_staff_location_assignment(client, manager_headers, staff_user, db):
    loc = Location(name="Assignment Test Warehouse")
    db.add(loc)
    db.commit()

    # Assign staff to location
    assign_res = client.put(
        f"/api/locations/{loc.id}/staff",
        json={"staff_user_ids": [str(staff_user.id)]},
        headers=manager_headers,
    )
    assert assign_res.status_code == 200
    assert len(assign_res.json()) == 1
    assert assign_res.json()[0]["id"] == str(staff_user.id)

    # Verify via location staff list
    list_res = client.get(f"/api/locations/{loc.id}/staff", headers=manager_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
