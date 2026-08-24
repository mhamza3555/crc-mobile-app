import os

from dotenv import load_dotenv


load_dotenv()


PRE_DIAGNOSTIC_FEATURES = [
    "Age", "Gender",
    "Smoking_History", "Alcohol_Consumption", "Obesity_BMI",
    "Diabetes", "Inflammatory_Bowel_Disease", "Family_History",
    "Diet_Risk", "Physical_Activity",
    "Abdominal Pain", "Bleeding PR", "Weight Loss", "Bowel Change",
    "Tenesmus", "Anemia related symptoms",
    "Abdominal Mass Palpable", "PR Exam Suspicious",
    "ECOG status", "Pallor",
    "Hemoglobin", "FIT/FOBT", "CEA_Level",
    "Liver function Test", "serum Albumin"
]


def get_database_url() -> str | None:
    """Return a SQLAlchemy-compatible database URL, if configured."""
    url = os.getenv("DATABASE_URL")
    if not url:
        return None

    # Neon commonly supplies a postgres:// URL; SQLAlchemy needs the driver name.
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url
