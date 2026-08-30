from uuid import uuid4
import pytest
from app.models.models import Item, Category, User, UserRole


def test_item_history_and_notes(client, manager_headers, staff_headers):
    # 1. Manager creates an item
    create_res = client.post(
        "/api/items",
        json={
            "sku": "SKU-HIST-1",
            "name": "Audit Tracked Tool",
            "unit_of_measure": "pcs",
            "reorder_level": 15,
        },
        headers=manager_headers,
    )
    assert create_res.status_code == 201
    item_id = create_res.json()["id"]

    # 2. Manager edits the item name and reorder level
    edit_res = client.put(
        f"/api/items/{item_id}",
        json={
            "name": "Audit Tracked Tool Pro",
            "reorder_level": 25,
        },
        headers=manager_headers,
    )
    assert edit_res.status_code == 200

    # 3. Staff adds a note to the item
    staff_note_res = client.post(
        f"/api/items/{item_id}/notes",
        json={"note": "Damaged packing box found in aisle 4, contents inspected and intact."},
        headers=staff_headers,
    )
    assert staff_note_res.status_code == 201
    assert staff_note_res.json()["action"] == "NOTE"
    assert "aisle 4" in staff_note_res.json()["note"]

    # 4. Manager adds a manager note
    mgr_note_res = client.post(
        f"/api/items/{item_id}/notes",
        json={"note": "Supplier notified regarding secondary packaging quality."},
        headers=manager_headers,
    )
    assert mgr_note_res.status_code == 201

    # 5. Query full history (ALL)
    hist_all = client.get(f"/api/items/{item_id}/history", headers=manager_headers)
    assert hist_all.status_code == 200
    records = hist_all.json()
    # Expect: CREATED, 2x FIELD_CHANGE (name, reorder_level), 2x NOTE = 5 records
    assert len(records) == 5

    # 6. Filter by NOTES
    hist_notes = client.get(f"/api/items/{item_id}/history?action_type=NOTES", headers=staff_headers)
    assert hist_notes.status_code == 200
    notes_only = hist_notes.json()
    assert len(notes_only) == 2
    assert all(r["action"] == "NOTE" for r in notes_only)

    # 7. Filter by CHANGES
    hist_changes = client.get(f"/api/items/{item_id}/history?action_type=CHANGES", headers=manager_headers)
    assert hist_changes.status_code == 200
    changes_only = hist_changes.json()
    assert len(changes_only) == 3
    actions = [r["action"] for r in changes_only]
    assert "CREATED" in actions
    assert "FIELD_CHANGE" in actions
