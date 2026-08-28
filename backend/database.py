"""Database setup for optional PostgreSQL/Neon assessment persistence."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_database_url


class Base(DeclarativeBase):
    pass


database_url = get_database_url()
engine = None
SessionLocal = None

if database_url:
    connect_args = (
        {"check_same_thread": False}
        if database_url.startswith("sqlite")
        else {}
    )
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )


def is_database_configured() -> bool:
    return engine is not None


def init_db() -> None:
    if engine is None:
        return

    from . import models

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()