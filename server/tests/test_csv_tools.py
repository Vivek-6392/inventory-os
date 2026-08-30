import io
import pytest
from starlette.testclient import TestClient
from uuid import uuid4

from app.models.models import Item, StockMovement, MovementKind, Location, Category


def test_bulk_csv_import_success(client: TestClient, manager_headers: dict):
    sku1 = f"CSV-TEST-1-{uuid4().hex[:6]}"
    sku2 = f"CSV-TEST-2-{uuid4().hex[:6]}"

    csv_data = f"""sku,name,description,category,unit_of_measure,reorder_level,initial_stock,initial_location
{sku1},Test Product 1,A great product,Imported Cat,pcs,10,50,Import Depot
{sku2},Test Product 2,,Imported Cat,box,5,0,
"""
    files = {"file": ("items.csv", csv_data.encode("utf-8"), "text/csv")}
    response = client.post("/api/items/import-csv", headers=manager_headers, files=files)

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["imported"] == 2
    assert data["failed"] == 0
    assert len(data["errors"]) == 0

    # Verify item 1 in items list
    item1_res = client.get(f"/api/items?search={sku1}", headers=manager_headers)
    assert item1_res.status_code == 200
    items = item1_res.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Test Product 1"
    assert items[0]["on_hand"] == 50  # initial stock receipt recorded!


def test_bulk_csv_import_partial_failure_with_row_errors(client: TestClient, manager_headers: dict):
    valid_sku = f"CSV-VAL-{uuid4().hex[:6]}"
    dup_sku = f"CSV-DUP-{uuid4().hex[:6]}"

    csv_data = f"""sku,name,description,category,unit_of_measure,reorder_level,initial_stock,initial_location
{valid_sku},Valid Product,,Tools,pcs,10,0,
,Missing SKU Product,,Tools,pcs,5,0,
{dup_sku},Duplicate 1,,Tools,pcs,5,0,
{dup_sku},Duplicate 2,,Tools,pcs,5,0,
INV-STOCK,Initial Stock No Loc,,Tools,pcs,5,15,
"""
    files = {"file": ("items_partial.csv", csv_data.encode("utf-8"), "text/csv")}
    response = client.post("/api/items/import-csv", headers=manager_headers, files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 2  # valid_sku and first dup_sku succeed
    assert data["failed"] == 3    # row 3 (missing SKU), row 5 (duplicate in batch), row 6 (initial stock > 0 but no loc)
    assert len(data["errors"]) == 3

    # Row 3 (line index in CSV file)
    row_numbers = [e["row"] for e in data["errors"]]
    assert 3 in row_numbers  # missing sku
    assert 5 in row_numbers  # duplicate sku in batch
    assert 6 in row_numbers  # missing initial_location


def test_bulk_csv_import_role_enforcement(client: TestClient, staff_headers: dict):
    csv_data = "sku,name,unit_of_measure,reorder_level\nTEST,Test,pcs,10\n"
    files = {"file": ("items.csv", csv_data.encode("utf-8"), "text/csv")}
    response = client.post("/api/items/import-csv", headers=staff_headers, files=files)
    assert response.status_code == 403


def test_stock_position_csv_export(client: TestClient, staff_headers: dict):
    response = client.get("/api/items/export-csv", headers=staff_headers)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "stock_position_report.csv" in response.headers.get("content-disposition", "")
    content = response.text
    assert "SKU,Item Name,Description,Category,Unit of Measure" in content
