import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from backend import database
from backend.config import PRE_DIAGNOSTIC_FEATURES
from backend.database import Base
from backend.main import app, get_current_user_id
from backend.models import Assessment, User


client = TestClient(app)


def sample_patient():
    data = {
        feature: 0
        for feature in PRE_DIAGNOSTIC_FEATURES
    }

    data["Age"] = 58
    data["Gender"] = "Male"

    return data


@pytest.fixture(autouse=True)
def reset_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_requires_all_25_features():
    app.dependency_overrides[get_current_user_id] = (
        lambda: "test-user"
    )

    response = client.post(
        "/predict",
        json={
            "patient_data": {
                "Age": 58,
            },
        },
    )

    assert response.status_code == 422
    assert "missing_features" in response.json()["detail"]


def test_predict_model_contract(monkeypatch):
    app.dependency_overrides[get_current_user_id] = (
        lambda: "test-user"
    )

    monkeypatch.setattr(
        "backend.main.is_database_configured",
        lambda: False,
    )

    response = client.post(
        "/predict",
        json={
            "patient_data": sample_patient(),
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["risk"] in {"HIGH", "LOW"}
    assert 0 <= body["probability"] <= 1
    assert body["mode"] == "model"
    assert "threshold" in body
    assert "medical diagnosis" in body["message"].lower()


def test_predict_requires_authentication(monkeypatch):
    monkeypatch.setattr(
        "backend.main.is_database_configured",
        lambda: False,
    )

    response = client.post(
        "/predict",
        json={
            "patient_data": sample_patient(),
        },
    )

    assert response.status_code == 401


def test_assessments_requires_authentication(monkeypatch):
    monkeypatch.setattr(
        "backend.main.is_database_configured",
        lambda: True,
    )

    response = client.get("/assessments")

    assert response.status_code == 401


def test_register_and_login(monkeypatch, tmp_path):
    engine = database.create_engine(
        f"sqlite:///{tmp_path / 'auth.db'}"
    )

    Base.metadata.create_all(bind=engine)

    test_session = sessionmaker(bind=engine)

    monkeypatch.setattr(
        database,
        "SessionLocal",
        test_session,
    )

    monkeypatch.setattr(
        "backend.main.is_database_configured",
        lambda: True,
    )

    email = f"patient-{uuid.uuid4()}@example.com"
    password = "StrongTestPassword123!"

    register_response = client.post(
        "/auth/register",
        json={
            "name": "Test Patient",
            "email": email,
            "password": password,
            "role": "patient",
        },
    )

    assert register_response.status_code == 200

    registered_user = register_response.json()

    assert registered_user["name"] == "Test Patient"
    assert registered_user["email"] == email
    assert registered_user["role"] == "patient"
    assert registered_user["id"]

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    login_body = login_response.json()

    assert login_body["token_type"] == "bearer"
    assert login_body["access_token"]
    assert login_body["user"]["id"] == registered_user["id"]
    assert login_body["user"]["email"] == email


def test_authenticated_predict_and_assessment_history(
    monkeypatch,
    tmp_path,
):
    engine = database.create_engine(
        f"sqlite:///{tmp_path / 'integration.db'}"
    )

    Base.metadata.create_all(bind=engine)

    test_session = sessionmaker(bind=engine)

    monkeypatch.setattr(
        database,
        "SessionLocal",
        test_session,
    )

    monkeypatch.setattr(
        "backend.main.is_database_configured",
        lambda: True,
    )

    email = f"patient-{uuid.uuid4()}@example.com"
    password = "StrongTestPassword123!"

    register_response = client.post(
        "/auth/register",
        json={
            "name": "Integration Patient",
            "email": email,
            "password": password,
            "role": "patient",
        },
    )

    assert register_response.status_code == 200

    user_id = register_response.json()["id"]

    login_response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {token}",
    }

    predict_response = client.post(
        "/predict",
        headers=headers,
        json={
            "patient_data": sample_patient(),
        },
    )

    assert predict_response.status_code == 200

    prediction = predict_response.json()

    assert prediction["risk"] in {"HIGH", "LOW"}
    assert 0 <= prediction["probability"] <= 1
    assert prediction["mode"] == "model"

    history_response = client.get(
        "/assessments",
        headers=headers,
    )

    assert history_response.status_code == 200

    history = history_response.json()

    assert len(history) == 1
    assert history[0]["user_id"] == user_id
    assert history[0]["risk"] == prediction["risk"]
    assert history[0]["probability"] == prediction["probability"]


def test_assessments_are_isolated_between_users(
    monkeypatch,
    tmp_path,
):
    engine = database.create_engine(
        f"sqlite:///{tmp_path / 'isolation.db'}"
    )

    Base.metadata.create_all(bind=engine)

    test_session = sessionmaker(bind=engine)

    monkeypatch.setattr(
        database,
        "SessionLocal",
        test_session,
    )

    monkeypatch.setattr(
        "backend.main.is_database_configured",
        lambda: True,
    )

    users = [
        {
            "name": "Patient One",
            "email": f"patient-one-{uuid.uuid4()}@example.com",
            "password": "PasswordOne123!",
        },
        {
            "name": "Patient Two",
            "email": f"patient-two-{uuid.uuid4()}@example.com",
            "password": "PasswordTwo123!",
        },
    ]

    tokens = []

    for user in users:
        register_response = client.post(
            "/auth/register",
            json={
                **user,
                "role": "patient",
            },
        )

        assert register_response.status_code == 200

        login_response = client.post(
            "/auth/login",
            json={
                "email": user["email"],
                "password": user["password"],
            },
        )

        assert login_response.status_code == 200

        tokens.append(
            login_response.json()["access_token"]
        )

    first_predict_response = client.post(
        "/predict",
        headers={
            "Authorization": f"Bearer {tokens[0]}",
        },
        json={
            "patient_data": sample_patient(),
        },
    )

    assert first_predict_response.status_code == 200

    first_history_response = client.get(
        "/assessments",
        headers={
            "Authorization": f"Bearer {tokens[0]}",
        },
    )

    second_history_response = client.get(
        "/assessments",
        headers={
            "Authorization": f"Bearer {tokens[1]}",
        },
    )

    assert first_history_response.status_code == 200
    assert second_history_response.status_code == 200

    first_history = first_history_response.json()
    second_history = second_history_response.json()

    assert len(first_history) == 1
    assert len(second_history) == 0