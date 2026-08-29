from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend import database, main
from backend.database import Base
from backend.models import Assessment, User


def test_predict_persists_assessment_when_database_is_configured(
    monkeypatch,
    tmp_path,
):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'assessments.db'}"
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(bind=engine)

    monkeypatch.setattr(database, "SessionLocal", test_session)
    monkeypatch.setattr(main, "is_database_configured", lambda: True)

    with test_session() as db:
        user = User(
            name="Test Patient",
            email="patient@test.com",
            role="patient",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        user_id = user.id

    response = main.predict(
        main.PredictionRequest(
            patient_data={
                **{
                    feature: 0
                    for feature in main.PRE_DIAGNOSTIC_FEATURES
                },
                "Age": 58,
                "Gender": "Male",
            }
        ),
        current_user_id=user_id,
    )

    with test_session() as db:
        saved = db.scalar(select(Assessment))

    assert saved is not None
    assert saved.user_id == user_id
    assert saved.patient_data["Age"] == 58
    assert saved.risk == response["risk"]
    assert saved.probability == response["probability"]
    assert saved.threshold == response["threshold"]


def test_get_assessments_returns_saved_records(
    monkeypatch,
    tmp_path,
):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'assessments.db'}"
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(bind=engine)

    monkeypatch.setattr(database, "SessionLocal", test_session)
    monkeypatch.setattr(main, "is_database_configured", lambda: True)

    with test_session() as db:
        user = User(
            name="Test Patient",
            email="patient@test.com",
            role="patient",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        user_id = user.id

        db.add(
            Assessment(
                user_id=user_id,
                patient_data={"Age": 65},
                mode="model",
                risk="HIGH",
                probability=0.71,
                threshold=0.425961,
            )
        )
        db.commit()

    results = main.get_assessments(
        current_user_id=user_id,
        limit=20,
    )

    assert len(results) == 1
    assert results[0]["user_id"] == user_id
    assert results[0]["risk"] == "HIGH"
    assert results[0]["probability"] == 0.71
    assert results[0]["threshold"] == 0.425961