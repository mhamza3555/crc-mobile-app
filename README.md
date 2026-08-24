# CRC Mobile App — Backend Prototype

## What this proves today

Mobile app -> FastAPI -> trained-model prediction response -> JSON.

The API loads `model/model_artifact.joblib` and returns its model score and
HIGH/LOW classification. This prototype is not a clinical diagnostic tool.

## Existing model workflow being preserved

The supplied research code defines 25 pre-diagnostic features and uses:
categorical encoding -> median imputation -> StandardScaler -> Logistic Regression
+ XGBoost -> SHAP-derived meta-features -> meta Logistic Regression.

## Run

    python -m venv .venv
    pip install -r requirements.txt
    uvicorn backend.main:app --reload

Then open:

    http://127.0.0.1:8000/docs

## Test

    python -m pytest -q

## Optional PostgreSQL / Neon persistence

Predictions can be saved without changing the model behavior. Copy
`.env.example` to a local `.env` file (it is ignored by Git) and add the Neon
connection string:

    DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

Start the API after loading that environment variable. On startup it creates the
`assessments` table; each successful `/predict` request is then recorded with the
submitted model inputs, model result, and timestamp. Without `DATABASE_URL`, the
API continues to run normally and does not store prediction data.

Do not commit a database URL or upload real patient data to a public repository.

## Next step

Get either the original Dataset 1 CSV or the already-trained model/preprocessing
artifacts. Then we can export the validated inference artifact and compare its
predictions against the original notebook before connecting the mobile frontend.

## Safety

Do not use demo mode for medical decisions.

## Real-model step
Copy `colorectal_cancer_dataset_1_kaggle.csv` into this project root, install requirements, then run:

    python train_model.py

This trains the CPV4-aligned XGBoost standalone model and saves `model/model_artifact.joblib` plus `model/training_metrics.json`. The backend will then load the artifact automatically.

Before production/clinical use, the team must confirm that standalone XGBoost is the approved final model and validate exact parity with the company's reference run.
