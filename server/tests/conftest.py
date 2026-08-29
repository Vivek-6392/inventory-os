import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.models import User, UserRole
from app.middleware.auth import hash_password, create_access_token

# Use SQLite in-memory for fast unit/integration tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def manager_user(db):
    user = User(
        email="manager@test.com",
        password_hash=hash_password("managerpass"),
        name="Test Manager",
        role=UserRole.MANAGER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def staff_user(db):
    user = User(
        email="staff@test.com",
        password_hash=hash_password("staffpass"),
        name="Test Staff",
        role=UserRole.STAFF,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def manager_headers(manager_user):
    token = create_access_token(str(manager_user.id), manager_user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def staff_headers(staff_user):
    token = create_access_token(str(staff_user.id), staff_user.role.value)
    return {"Authorization": f"Bearer {token}"}
