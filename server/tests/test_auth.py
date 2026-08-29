def test_register_and_login(client):
    # Register new user
    res = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@test.com",
            "password": "password123",
            "name": "New User",
            "role": "STAFF",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "newuser@test.com"
    assert data["name"] == "New User"
    assert data["role"] == "STAFF"

    # Login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "newuser@test.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Get Me
    me_res = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "newuser@test.com"


def test_login_invalid_password(client, manager_user):
    res = client.post(
        "/api/auth/login",
        json={"email": manager_user.email, "password": "wrongpassword"},
    )
    assert res.status_code == 401
