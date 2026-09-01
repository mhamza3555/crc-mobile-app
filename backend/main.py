from contextlib import asynccontextmanager
from typing import Any, Dict
from .ai_explanation import generate_risk_explanation
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select

from . import database
from .auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from .config import PRE_DIAGNOSTIC_FEATURES
from .database import init_db, is_database_configured
from .models import Assessment, User
from .predictor import Predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="CRC Risk Prediction API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = Predictor()

security = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token.",
        )

    return user_id


class PredictionRequest(BaseModel):
    patient_data: Dict[str, Any]


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "patient"


class LoginRequest(BaseModel):
    email: str
    password: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predictor.is_loaded,
        "database_configured": is_database_configured(),
    }


@app.post("/auth/register")
def register(request: RegisterRequest):
    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == request.email)
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=409,
                detail="Email is already registered.",
            )

        user = User(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password),
            role=request.role,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        }


@app.post("/auth/login")
def login(request: LoginRequest):
    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == request.email)
        )

        if user is None or not verify_password(
            request.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        token = create_access_token(user.id)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }


@app.post("/predict")
def predict(
    request: PredictionRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    missing = [
        feature
        for feature in PRE_DIAGNOSTIC_FEATURES
        if feature not in request.patient_data
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail={"missing_features": missing},
        )

    result = predictor.predict(request.patient_data)

    assessment_id = None
    ai_explanation = None

    if is_database_configured():
        with database.SessionLocal() as db:
            user = db.scalar(
                select(User).where(User.id == current_user_id)
            )

            if user is None:
                raise HTTPException(
                    status_code=404,
                    detail="User not found.",
                )

            assessment = Assessment(
                user_id=user.id,
                patient_data=request.patient_data,
                mode=result["mode"],
                risk=result["risk"],
                probability=result["probability"],
                threshold=result.get("threshold"),
            )

            db.add(assessment)
            db.commit()
            db.refresh(assessment)

            assessment_id = assessment.id

    ai_explanation = generate_risk_explanation(
        request.patient_data,
        result["risk"],
        result["probability"],
    )

    return {
        **result,
        "assessment_id": assessment_id,
        "ai_explanation": ai_explanation,
    }

@app.get("/assessments")
def get_assessments(
    current_user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=20, ge=1, le=100),
):
    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:
        statement = (
            select(Assessment)
            .where(Assessment.user_id == current_user_id)
            .order_by(Assessment.created_at.desc())
            .limit(limit)
        )

        assessments = db.scalars(statement).all()

    return [
        {
            "id": assessment.id,
            "user_id": assessment.user_id,
            "mode": assessment.mode,
            "risk": assessment.risk,
            "probability": assessment.probability,
            "threshold": assessment.threshold,
            "created_at": assessment.created_at,
            "patient_data": assessment.patient_data,
        }
        for assessment in assessments
    ]