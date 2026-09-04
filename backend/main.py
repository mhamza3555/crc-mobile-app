from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select

from . import database
from .ai_explanation import generate_risk_explanation
from .auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from .config import PRE_DIAGNOSTIC_FEATURES
from .database import init_db, is_database_configured
from .models import (
    Appointment,
    Assessment,
    AssessmentExplanation,
    User,
)
from .predictor import Predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="CRC Risk Prediction API",
    version="0.3.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:8083",
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


def get_current_user(
    current_user_id: str = Depends(get_current_user_id),
) -> User:

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.id == current_user_id)
        )

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        return user


def require_role(
    user: User,
    role: str,
) -> User:

    if user.role != role:
        raise HTTPException(
            status_code=403,
            detail=f"This action requires the {role} role.",
        )

    return user


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


class AppointmentRequest(BaseModel):
    doctor_id: str
    appointment_date: datetime | None = None
    notes: str | None = None


class AppointmentStatusRequest(BaseModel):
    status: str


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

    role = request.role.lower().strip()

    if role not in {"patient", "doctor"}:
        raise HTTPException(
            status_code=400,
            detail="Role must be either patient or doctor.",
        )

    with database.SessionLocal() as db:

        existing_user = db.scalar(
            select(User).where(
                User.email == request.email.strip().lower()
            )
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=409,
                detail="Email is already registered.",
            )

        user = User(
            name=request.name.strip(),
            email=request.email.strip().lower(),
            password_hash=hash_password(request.password),
            role=role,
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
            select(User).where(
                User.email == request.email.strip().lower()
            )
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

    ai_explanation = generate_risk_explanation(
        request.patient_data,
        result["risk"],
        result["probability"],
    )

    assessment_id = None

    if is_database_configured():

        with database.SessionLocal() as db:

            user = db.scalar(
                select(User).where(
                    User.id == current_user_id
                )
            )

            if user is None:
                raise HTTPException(
                    status_code=404,
                    detail="User not found.",
                )

            if user.role != "patient":
                raise HTTPException(
                    status_code=403,
                    detail="Only patient accounts can create assessments.",
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
            db.flush()

            explanation = AssessmentExplanation(
                assessment_id=assessment.id,
                explanation=ai_explanation,
            )

            db.add(explanation)

            db.commit()
            db.refresh(assessment)

            assessment_id = assessment.id

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
            .where(
                Assessment.user_id == current_user_id
            )
            .order_by(
                Assessment.created_at.desc()
            )
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
                "ai_explanation": (
                    assessment.explanation.explanation
                    if assessment.explanation
                    else None
                ),
            }
            for assessment in assessments
        ]


# ---------------------------------------------------------
# DOCTORS
# ---------------------------------------------------------


@app.get("/doctors")
def get_doctors(
    current_user_id: str = Depends(get_current_user_id),
):

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        doctors = db.scalars(
            select(User)
            .where(User.role == "doctor")
            .order_by(User.name.asc())
        ).all()

        return [
            {
                "id": doctor.id,
                "name": doctor.name,
                "email": doctor.email,
                "role": doctor.role,
            }
            for doctor in doctors
        ]


# ---------------------------------------------------------
# PATIENT APPOINTMENTS
# ---------------------------------------------------------


@app.post("/appointments")
def create_appointment(
    request: AppointmentRequest,
    current_user_id: str = Depends(get_current_user_id),
):

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        patient = db.scalar(
            select(User).where(
                User.id == current_user_id
            )
        )

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found.",
            )

        require_role(patient, "patient")

        doctor = db.scalar(
            select(User).where(
                User.id == request.doctor_id
            )
        )

        if doctor is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        require_role(doctor, "doctor")

        existing = db.scalar(
            select(Appointment).where(
                Appointment.patient_id == patient.id,
                Appointment.doctor_id == doctor.id,
                Appointment.status.in_(
                    ["PENDING", "ACCEPTED"]
                ),
            )
        )

        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="You already have an active appointment request with this doctor.",
            )

        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            status="PENDING",
            appointment_date=request.appointment_date,
            notes=request.notes,
        )

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        return {
            "id": appointment.id,
            "patient_id": appointment.patient_id,
            "doctor_id": appointment.doctor_id,
            "status": appointment.status,
            "requested_at": appointment.requested_at,
            "appointment_date": appointment.appointment_date,
            "notes": appointment.notes,
            "doctor": {
                "id": doctor.id,
                "name": doctor.name,
                "email": doctor.email,
            },
        }


@app.get("/appointments")
def get_patient_appointments(
    current_user_id: str = Depends(get_current_user_id),
):

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        patient = db.scalar(
            select(User).where(
                User.id == current_user_id
            )
        )

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found.",
            )

        require_role(patient, "patient")

        appointments = db.scalars(
            select(Appointment)
            .where(
                Appointment.patient_id == patient.id
            )
            .order_by(
                Appointment.requested_at.desc()
            )
        ).all()

        return [
            {
                "id": appointment.id,
                "status": appointment.status,
                "requested_at": appointment.requested_at,
                "appointment_date": appointment.appointment_date,
                "notes": appointment.notes,
                "doctor": {
                    "id": appointment.doctor.id,
                    "name": appointment.doctor.name,
                    "email": appointment.doctor.email,
                },
            }
            for appointment in appointments
        ]


# ---------------------------------------------------------
# DOCTOR APPOINTMENTS
# ---------------------------------------------------------


@app.get("/doctor/appointments")
def get_doctor_appointments(
    current_user_id: str = Depends(get_current_user_id),
):

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        doctor = db.scalar(
            select(User).where(
                User.id == current_user_id
            )
        )

        if doctor is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        require_role(doctor, "doctor")

        appointments = db.scalars(
            select(Appointment)
            .where(
                Appointment.doctor_id == doctor.id
            )
            .order_by(
                Appointment.requested_at.desc()
            )
        ).all()

        results = []

        for appointment in appointments:

            latest_assessment = db.scalar(
                select(Assessment)
                .where(
                    Assessment.user_id
                    == appointment.patient_id
                )
                .order_by(
                    Assessment.created_at.desc()
                )
            )

            results.append(
                {
                    "id": appointment.id,
                    "status": appointment.status,
                    "requested_at": appointment.requested_at,
                    "appointment_date": appointment.appointment_date,
                    "notes": appointment.notes,
                    "patient": {
                        "id": appointment.patient.id,
                        "name": appointment.patient.name,
                        "email": appointment.patient.email,
                    },
                    "latest_assessment": (
                        {
                            "risk": latest_assessment.risk,
                            "probability": latest_assessment.probability,
                            "created_at": latest_assessment.created_at,
                        }
                        if latest_assessment
                        else None
                    ),
                }
            )

        return results


@app.patch("/doctor/appointments/{appointment_id}")
def update_appointment_status(
    appointment_id: str,
    request: AppointmentStatusRequest,
    current_user_id: str = Depends(get_current_user_id),
):

    if request.status not in {
        "ACCEPTED",
        "REJECTED",
        "COMPLETED",
        "CANCELLED",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid appointment status.",
        )

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        doctor = db.scalar(
            select(User).where(
                User.id == current_user_id
            )
        )

        if doctor is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        require_role(doctor, "doctor")

        appointment = db.scalar(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.doctor_id == doctor.id,
            )
        )

        if appointment is None:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found.",
            )

        appointment.status = request.status

        db.commit()
        db.refresh(appointment)

        return {
            "id": appointment.id,
            "status": appointment.status,
            "requested_at": appointment.requested_at,
            "appointment_date": appointment.appointment_date,
            "notes": appointment.notes,
        }


# ---------------------------------------------------------
# DOCTOR PATIENTS
# ---------------------------------------------------------


@app.get("/doctor/patients")
def get_doctor_patients(
    current_user_id: str = Depends(get_current_user_id),
):

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        doctor = db.scalar(
            select(User).where(
                User.id == current_user_id
            )
        )

        if doctor is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        require_role(doctor, "doctor")

        accepted_appointments = db.scalars(
            select(Appointment)
            .where(
                Appointment.doctor_id == doctor.id,
                Appointment.status.in_(
                    ["ACCEPTED", "COMPLETED"]
                ),
            )
        ).all()

        patient_ids = {
            appointment.patient_id
            for appointment in accepted_appointments
        }

        if not patient_ids:
            return []

        patients = db.scalars(
            select(User)
            .where(User.id.in_(patient_ids))
            .order_by(User.name.asc())
        ).all()

        results = []

        for patient in patients:

            latest = db.scalar(
                select(Assessment)
                .where(
                    Assessment.user_id == patient.id
                )
                .order_by(
                    Assessment.created_at.desc()
                )
            )

            results.append(
                {
                    "id": patient.id,
                    "name": patient.name,
                    "email": patient.email,
                    "latest_assessment": (
                        {
                            "risk": latest.risk,
                            "probability": latest.probability,
                            "created_at": latest.created_at,
                        }
                        if latest
                        else None
                    ),
                }
            )

        return results


@app.get("/doctor/patients/{patient_id}")
def get_doctor_patient(
    patient_id: str,
    current_user_id: str = Depends(get_current_user_id),
):

    if not is_database_configured():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured.",
        )

    with database.SessionLocal() as db:

        doctor = db.scalar(
            select(User).where(
                User.id == current_user_id
            )
        )

        if doctor is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        require_role(doctor, "doctor")

        accepted = db.scalar(
            select(Appointment).where(
                Appointment.doctor_id == doctor.id,
                Appointment.patient_id == patient_id,
                Appointment.status.in_(
                    ["ACCEPTED", "COMPLETED"]
                ),
            )
        )

        if accepted is None:
            raise HTTPException(
                status_code=403,
                detail="This patient has not been assigned to you.",
            )

        patient = db.scalar(
            select(User).where(
                User.id == patient_id
            )
        )

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found.",
            )

        assessments = db.scalars(
            select(Assessment)
            .where(
                Assessment.user_id == patient.id
            )
            .order_by(
                Assessment.created_at.desc()
            )
        ).all()

        return {
            "patient": {
                "id": patient.id,
                "name": patient.name,
                "email": patient.email,
                "role": patient.role,
            },
            "assessments": [
                {
                    "id": assessment.id,
                    "mode": assessment.mode,
                    "risk": assessment.risk,
                    "probability": assessment.probability,
                    "threshold": assessment.threshold,
                    "created_at": assessment.created_at,
                    "patient_data": assessment.patient_data,
                    "ai_explanation": (
                        assessment.explanation.explanation
                        if assessment.explanation
                        else None
                    ),
                }
                for assessment in assessments
            ],
        }