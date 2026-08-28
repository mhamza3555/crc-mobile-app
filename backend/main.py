from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from .config import PRE_DIAGNOSTIC_FEATURES
from .database import init_db, is_database_configured
from . import database
from .predictor import Predictor
from .models import Assessment


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="CRC Risk Prediction API",
    version="0.2.0",
    lifespan=lifespan,
)

predictor = Predictor()

class PredictionRequest(BaseModel):
    user_id: str
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
    missing = [
        f
        for f in PRE_DIAGNOSTIC_FEATURES
        if f not in request.patient_data
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail={"missing_features": missing},
        )

    result = predictor.predict(request.patient_data)

    if is_database_configured():
        with database.SessionLocal() as db:
            db.add(
                Assessment(
                    user_id=request.user_id,
                    patient_data=request.patient_data,
                    mode=result["mode"],
                    risk=result["risk"],
                    probability=result["probability"],
                    threshold=result.get("threshold"),
                )
            )
            db.commit()

    return result


@app.get("/assessments")
def get_assessments(
    limit: int = Query(default=20, ge=1, le=100)
):
    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:
        statement = (
            select(Assessment)
            .order_by(Assessment.created_at.desc())
            .limit(limit)
        )

        assessments = db.scalars(statement).all()

    return [
        {
            "id": assessment.id,
            "mode": assessment.mode,
            "risk": assessment.risk,
            "probability": assessment.probability,
            "threshold": assessment.threshold,
            "created_at": assessment.created_at,
        }
        for assessment in assessments
    ]