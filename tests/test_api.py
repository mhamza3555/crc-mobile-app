from fastapi.testclient import TestClient

from backend.config import PRE_DIAGNOSTIC_FEATURES
from backend.main import app, get_current_user_id


client = TestClient(app)

TEST_USER_ID = "test-user"

app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID


def sample_patient():
    data = {
        feature: 0
        for feature in PRE_DIAGNOSTIC_FEATURES
    }

    data["Age"] = 58
    data["Gender"] = "Male"

    return data


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_requires_all_25_features():
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


def test_predict_requires_authentication():
    app.dependency_overrides.pop(get_current_user_id, None)

    response = client.post(
        "/predict",
        json={
            "patient_data": sample_patient(),
        },
    )

    assert response.status_code == 401

    app.dependency_overrides[get_current_user_id] = (
        lambda: TEST_USER_ID
    )


def test_assessments_requires_authentication():
    app.dependency_overrides.pop(get_current_user_id, None)

    response = client.get("/assessments")

    assert response.status_code == 401

    app.dependency_overrides[get_current_user_id] = (
        lambda: TEST_USER_ID
    )