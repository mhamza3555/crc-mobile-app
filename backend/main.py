from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from .config import PRE_DIAGNOSTIC_FEATURES
from .predictor import Predictor

app = FastAPI(title="CRC Risk Prediction API", version="0.1.0")
predictor = Predictor()

class PredictionRequest(BaseModel):
    patient_data: Dict[str, Any]

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": predictor.is_loaded}

@app.post("/predict")
def predict(request: PredictionRequest):
    missing = [f for f in PRE_DIAGNOSTIC_FEATURES if f not in request.patient_data]
    if missing:
        raise HTTPException(status_code=422, detail={"missing_features": missing})
    return predictor.predict(request.patient_data)
