def test_category_crud(client, manager_headers, staff_headers):
    # Manager can create category
    res = client.post(
        "/api/categories",
        json={"name": "Electronics"},
        headers=manager_headers,
    )
    assert res.status_code == 201
    cat_id = res.json()["id"]
    assert res.json()["name"] == "Electronics"

    # Staff cannot create category (403)
    staff_res = client.post(
        "/api/categories",
        json={"name": "Hardware"},
        headers=staff_headers,
    )
    assert staff_res.status_code == 403

    # Both can list categories
    list_res = client.get("/api/categories", headers=staff_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


def test_item_crud_and_role_enforcement(client, manager_headers, staff_headers):
    # Create category first
    cat_res = client.post(
        "/api/categories",
        json={"name": "Tools"},
        headers=manager_headers,
    )
    cat_id = cat_res.json()["id"]

    # Manager creates item
    item_res = client.post(
        "/api/items",
        json={
            "sku": "SKU-TEST-001",
            "name": "Hammer 16oz",
            "description": "Steel claw hammer",
            "unit_of_measure": "pcs",
            "reorder_level": 15,
            "category_id": cat_id,
        },
        headers=manager_headers,
    )
    assert item_res.status_code == 201
    item_data = item_res.json()
    item_id = item_data["id"]
    assert item_data["sku"] == "SKU-TEST-001"
    assert item_data["on_hand"] == 0

    # Staff cannot create item (403)
    staff_create = client.post(
        "/api/items",
        json={
            "sku": "SKU-TEST-002",
            "name": "Wrench",
            "unit_of_measure": "pcs",
            "reorder_level": 5,
        },
        headers=staff_headers,
    )
    assert staff_create.status_code == 403

    # Duplicate SKU rejected (409)
    dup_res = client.post(
        "/api/items",
        json={
            "sku": "SKU-TEST-001",
            "name": "Another Hammer",
            "unit_of_measure": "pcs",
            "reorder_level": 10,
        },
        headers=manager_headers,
    )
    assert dup_res.status_code == 409

    # Manager can edit item
    edit_res = client.put(
        f"/api/items/{item_id}",
        json={"name": "Heavy Duty Hammer 16oz", "reorder_level": 20},
        headers=manager_headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["name"] == "Heavy Duty Hammer 16oz"
    assert edit_res.json()["reorder_level"] == 20

    # Manager can archive item
    archive_res = client.patch(
        f"/api/items/{item_id}/archive",
        headers=manager_headers,
    )
    assert archive_res.status_code == 200
    assert archive_res.json()["archived"] is True


def test_item_server_side_search_and_pagination(client, manager_headers, staff_headers):
    # Create 3 items
    for i in range(1, 4):
        client.post(
            "/api/items",
            json={
                "sku": f"SKU-SEARCH-{i:03d}",
                "name": f"Product Item {i}",
                "unit_of_measure": "pcs",
                "reorder_level": i * 5,
            },
            headers=manager_headers,
        )

    # Search by SKU
    res = client.get("/api/items?search=SEARCH-002", headers=staff_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["sku"] == "SKU-SEARCH-002"

    # Pagination test
    page_res = client.get("/api/items?page=1&limit=2", headers=staff_headers)
    assert page_res.status_code == 200
    assert len(page_res.json()["items"]) == 2
    assert page_res.json()["total"] == 3
    assert page_res.json()["pages"] == 2
