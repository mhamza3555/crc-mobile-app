"""Database records kept separately from the ML inference artifact."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Assessment(Base):
    """An immutable record of one submitted assessment and model result."""

    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    risk: Mapped[str] = mapped_column(String(10), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
