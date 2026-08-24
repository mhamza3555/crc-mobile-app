# CRC Mobile App — Backend Prototype

## What this proves today

Mobile app -> FastAPI -> prediction response -> JSON.

The API is currently in **demo mode** because the uploaded project contains the
research script/results but not the raw Dataset 1 CSV or a trained model artifact.
The demo response is NOT the research model and must not be used clinically.

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

    pytest -q

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
