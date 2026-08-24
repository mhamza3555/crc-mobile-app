from fastapi.testclient import TestClient
from backend.main import app
from backend.config import PRE_DIAGNOSTIC_FEATURES

client = TestClient(app)

def sample_patient():
    data = {feature: 0 for feature in PRE_DIAGNOSTIC_FEATURES}
    data["Age"] = 58
    data["Gender"] = "Male"
    return data

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_predict_requires_all_25_features():
    response = client.post("/predict", json={"patient_data": {"Age": 58}})
    assert response.status_code == 422
    assert "missing_features" in response.json()["detail"]

def test_predict_demo_contract():
    response = client.post("/predict", json={"patient_data": sample_patient()})
    assert response.status_code == 200
    body = response.json()
    assert body["risk"] in {"HIGH", "LOW"}
    assert 0 <= body["probability"] <= 1
    assert "top_factors" in body
