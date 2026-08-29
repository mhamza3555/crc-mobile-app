from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
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