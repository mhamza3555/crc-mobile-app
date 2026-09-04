from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    patient_appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="patient",
        foreign_keys="Appointment.patient_id",
        cascade="all, delete-orphan",
    )

    doctor_appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="doctor",
        foreign_keys="Appointment.doctor_id",
        cascade="all, delete-orphan",
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="assessments",
    )

    patient_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    mode: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    risk: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    threshold: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    explanation: Mapped["AssessmentExplanation | None"] = relationship(
        back_populates="assessment",
        uselist=False,
        cascade="all, delete-orphan",
    )


class AssessmentExplanation(Base):
    __tablename__ = "assessment_explanations"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    assessment_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assessments.id"),
        unique=True,
        nullable=False,
    )

    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    assessment: Mapped["Assessment"] = relationship(
        back_populates="explanation",
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    patient_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )

    doctor_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
    )

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    appointment_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    patient: Mapped["User"] = relationship(
        back_populates="patient_appointments",
        foreign_keys=[patient_id],
    )

    doctor: Mapped["User"] = relationship(
        back_populates="doctor_appointments",
        foreign_keys=[doctor_id],
    )