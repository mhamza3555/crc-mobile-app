from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
from .config import PRE_DIAGNOSTIC_FEATURES
from .database import init_db, is_database_configured
from .predictor import Predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="CRC Risk Prediction API", version="0.2.0", lifespan=lifespan)
predictor = Predictor()

class PredictionRequest(BaseModel):
    patient_data: Dict[str, Any]

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predictor.is_loaded,
        "database_configured": is_database_configured(),
    }

@app.post("/predict")
def predict(request: PredictionRequest):
    missing = [f for f in PRE_DIAGNOSTIC_FEATURES if f not in request.patient_data]
    if missing:
        raise HTTPException(status_code=422, detail={"missing_features": missing})
    result = predictor.predict(request.patient_data)

    # Persistence is deliberately optional during local development. When a
    # DATABASE_URL is supplied, every prediction is recorded in PostgreSQL.
    if is_database_configured():
        from .database import SessionLocal
        from .models import Assessment

        with SessionLocal() as db:
            db.add(
                Assessment(
                    patient_data=request.patient_data,
                    mode=result["mode"],
                    risk=result["risk"],
                    probability=result["probability"],
                    threshold=result.get("threshold"),
                )
            )
            db.commit()

    return result
