from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import (
    train_test_split,
    StratifiedKFold,
    GridSearchCV
)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score,
    precision_recall_curve,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)
from xgboost import XGBClassifier


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_SEED = 42

DATASET = Path("colorectal_cancer_dataset_1_kaggle.csv")
ARTIFACT_DIR = Path("model")
ARTIFACT_DIR.mkdir(exist_ok=True)

TARGET = "Cancer_Stage"
COUNTRY = "Country"

# These are the same 25 pre-diagnostic features
# used by the supplied workflow.
FEATURES = [
    "Age",
    "Gender",
    "Smoking_History",
    "Alcohol_Consumption",
    "Obesity_BMI",
    "Diabetes",
    "Inflammatory_Bowel_Disease",
    "Family_History",
    "Diet_Risk",
    "Physical_Activity",
    "Abdominal Pain",
    "Bleeding PR",
    "Weight Loss",
    "Bowel Change",
    "Tenesmus",
    "Anemia related symptoms",
    "Abdominal Mass Palpable",
    "PR Exam Suspicious",
    "ECOG status",
    "Pallor",
    "Hemoglobin ",
    "FIT/FOBT",
    "CEA_Level",
    "Liver function Test",
    "serum Albumin",
]


# ============================================================
# STEP 1 — LOAD DATA
# ============================================================

print("=" * 90)
print("CRC RISK STRATIFICATION — MODEL TRAINING")
print("=" * 90)

if not DATASET.exists():
    raise FileNotFoundError(
        f"Missing dataset: {DATASET}\n"
        "Place colorectal_cancer_dataset_1_kaggle.csv next to train_model.py."
    )

df = pd.read_csv(DATASET)

print(f"\nDataset loaded: {len(df):,} rows")
print(f"Columns: {len(df.columns)}")


# The supplied dataset/code contains a trailing space in
# "Hemoglobin ". We preserve that feature name here.
missing = [
    col
    for col in FEATURES + [TARGET, COUNTRY]
    if col not in df.columns
]

if missing:
    print("\nMissing columns:")
    for col in missing:
        print(repr(col))
    raise ValueError(f"Missing required columns: {missing}")


# ============================================================
# STEP 2 — TARGET DEFINITION
# ============================================================

print("\nSTEP 2 — Creating target variable")

y = df[TARGET].apply(
    lambda x: 1 if x in ["Regional", "Distant"] else 0
)

X = df[FEATURES].copy()

print(f"Positive cases: {int(y.sum()):,}")
print(f"Negative cases: {int((y == 0).sum()):,}")


# ============================================================
# STEP 3 — GEOGRAPHIC SPLIT
# ============================================================

print("\nSTEP 3 — Separating Pakistan hold-out")

pakistan_mask = df[COUNTRY] == "Pakistan"

X_global = X.loc[~pakistan_mask].copy()
X_pakistan = X.loc[pakistan_mask].copy()

y_global = y.loc[~pakistan_mask].copy()
y_pakistan = y.loc[pakistan_mask].copy()

print(f"Global dataset:   {len(X_global):,}")
print(f"Pakistan holdout: {len(X_pakistan):,}")


# ============================================================
# STEP 4 — 80/20 GLOBAL SPLIT
# ============================================================

print("\nSTEP 4 — 80/20 stratified global split")

X_train, X_test, y_train, y_test = train_test_split(
    X_global,
    y_global,
    test_size=0.20,
    stratify=y_global,
    random_state=RANDOM_SEED,
)

print(f"Training:     {len(X_train):,}")
print(f"Internal test:{len(X_test):,}")
print(f"Pakistan:     {len(X_pakistan):,}")


# ============================================================
# STEP 5 — CATEGORICAL ENCODING
# ============================================================

print("\nSTEP 5 — Encoding categorical variables")

encoders = {}

categorical_columns = X_train.select_dtypes(
    include=["object"]
).columns.tolist()

for col in categorical_columns:

    encoder = LabelEncoder()

    X_train[col] = encoder.fit_transform(
        X_train[col].astype(str)
    )

    X_test[col] = encoder.transform(
        X_test[col].astype(str)
    )

    # Same behavior as the supplied workflow:
    # unseen Pakistan categories are mapped to 0.
    known_classes = set(encoder.classes_)

    X_pakistan[col] = (
        X_pakistan[col]
        .astype(str)
        .map(
            lambda value:
            encoder.transform([value])[0]
            if value in known_classes
            else 0
        )
    )

    encoders[col] = encoder

print(f"Encoded {len(encoders)} categorical variables")


# ============================================================
# STEP 6 — MEDIAN IMPUTATION
# ============================================================

print("\nSTEP 6 — Median imputation")

imputer = SimpleImputer(strategy="median")

X_train = pd.DataFrame(
    imputer.fit_transform(X_train),
    columns=FEATURES,
)

X_test = pd.DataFrame(
    imputer.transform(X_test),
    columns=FEATURES,
)

X_pakistan = pd.DataFrame(
    imputer.transform(X_pakistan),
    columns=FEATURES,
)


# ============================================================
# STEP 7 — STANDARD SCALING
# ============================================================

print("\nSTEP 7 — StandardScaler")

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
X_pakistan_scaled = scaler.transform(X_pakistan)


# ============================================================
# STEP 8 — NESTED CROSS-VALIDATION
# ============================================================

print("\nSTEP 8 — Nested cross-validation")
print("5 outer folds × 3 inner folds")

outer_cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=RANDOM_SEED,
)

inner_cv = StratifiedKFold(
    n_splits=3,
    shuffle=True,
    random_state=RANDOM_SEED,
)

outer_auc = []
outer_accuracy = []
outer_precision = []
outer_recall = []
outer_f1 = []

for fold, (train_idx, validation_idx) in enumerate(
    outer_cv.split(X_train_scaled, y_train),
    start=1,
):

    print(f"\nOuter fold {fold}/5")

    X_outer_train = X_train_scaled[train_idx]
    X_outer_test = X_train_scaled[validation_idx]

    y_outer_train = y_train.iloc[train_idx]
    y_outer_test = y_train.iloc[validation_idx]

    # --------------------------------------------------------
    # Logistic Regression tuning
    # --------------------------------------------------------

    lr_grid = GridSearchCV(
        LogisticRegression(
            random_state=RANDOM_SEED
        ),
        {
            "C": [0.01, 0.1, 1.0, 10.0],
            "max_iter": [1000, 2000],
        },
        cv=inner_cv,
        scoring="roc_auc",
        n_jobs=-1,
    )

    lr_grid.fit(X_outer_train, y_outer_train)

    # --------------------------------------------------------
    # XGBoost tuning
    # --------------------------------------------------------

    xgb_grid = GridSearchCV(
        XGBClassifier(
            random_state=RANDOM_SEED,
            eval_metric="logloss",
        ),
        {
            "max_depth": [4, 5, 6],
            "learning_rate": [0.05, 0.1, 0.15],
            "n_estimators": [100, 150],
        },
        cv=inner_cv,
        scoring="roc_auc",
        n_jobs=-1,
    )

    xgb_grid.fit(X_outer_train, y_outer_train)

    best_lr = lr_grid.best_estimator_
    best_xgb = xgb_grid.best_estimator_

    # Probability predictions
    lr_probability = best_lr.predict_proba(
        X_outer_test
    )[:, 1]

    xgb_probability = best_xgb.predict_proba(
        X_outer_test
    )[:, 1]

    # Supplied workflow: average LR + XGB probabilities
    ensemble_probability = (
        lr_probability + xgb_probability
    ) / 2

    ensemble_prediction = (
        ensemble_probability > 0.5
    ).astype(int)

    fold_auc = roc_auc_score(
        y_outer_test,
        ensemble_probability,
    )

    fold_accuracy = accuracy_score(
        y_outer_test,
        ensemble_prediction,
    )

    fold_precision = precision_score(
        y_outer_test,
        ensemble_prediction,
        zero_division=0,
    )

    fold_recall = recall_score(
        y_outer_test,
        ensemble_prediction,
        zero_division=0,
    )

    fold_f1 = f1_score(
        y_outer_test,
        ensemble_prediction,
        zero_division=0,
    )

    outer_auc.append(fold_auc)
    outer_accuracy.append(fold_accuracy)
    outer_precision.append(fold_precision)
    outer_recall.append(fold_recall)
    outer_f1.append(fold_f1)

    print(f"  AUC: {fold_auc:.4f}")


nested_cv_metrics = {
    "auc_mean": float(np.mean(outer_auc)),
    "auc_std": float(np.std(outer_auc)),
    "accuracy_mean": float(np.mean(outer_accuracy)),
    "precision_mean": float(np.mean(outer_precision)),
    "recall_mean": float(np.mean(outer_recall)),
    "f1_mean": float(np.mean(outer_f1)),
}


print("\nNested CV complete.")
print(
    f"AUC: {nested_cv_metrics['auc_mean']:.4f}"
    f" ± {nested_cv_metrics['auc_std']:.4f}"
)


# ============================================================
# STEP 9 — FINAL DEPLOYMENT MODELS
# ============================================================

print("\nSTEP 9 — Training final deployment models")

# This follows the supplied Section 7 deployment configuration.

lr_model = LogisticRegression(
    C=0.1,
    max_iter=2000,
    random_state=RANDOM_SEED,
)

lr_model.fit(
    X_train_scaled,
    y_train,
)

xgb_model = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=RANDOM_SEED,
    eval_metric="logloss",
)

xgb_model.fit(
    X_train_scaled,
    y_train,
)


# ============================================================
# STEP 10 — ENSEMBLE PROBABILITIES
# ============================================================

print("\nSTEP 10 — Creating LR + XGB ensemble")

p_train_lr = lr_model.predict_proba(
    X_train_scaled
)[:, 1]

p_train_xgb = xgb_model.predict_proba(
    X_train_scaled
)[:, 1]

p_train_ensemble = (
    p_train_lr + p_train_xgb
) / 2

p_test_lr = lr_model.predict_proba(
    X_test_scaled
)[:, 1]

p_test_xgb = xgb_model.predict_proba(
    X_test_scaled
)[:, 1]

p_test_ensemble = (
    p_test_lr + p_test_xgb
) / 2

p_pak_lr = lr_model.predict_proba(
    X_pakistan_scaled
)[:, 1]

p_pak_xgb = xgb_model.predict_proba(
    X_pakistan_scaled
)[:, 1]

p_pakistan_ensemble = (
    p_pak_lr + p_pak_xgb
) / 2


# ============================================================
# STEP 11 — F1-MAXIMIZING DEPLOYMENT THRESHOLD
# ============================================================

print("\nSTEP 11 — Finding deployment threshold")

precision_curve, recall_curve, thresholds = (
    precision_recall_curve(
        y_train,
        p_train_ensemble,
    )
)

f1_scores = (
    2
    * precision_curve
    * recall_curve
    / (
        precision_curve
        + recall_curve
        + 1e-10
    )
)

best_index = int(np.argmax(f1_scores))

if best_index < len(thresholds):
    threshold = float(thresholds[best_index])
else:
    threshold = 0.5

print(f"Deployment threshold: {threshold:.6f}")


# ============================================================
# STEP 12 — VALIDATION
# ============================================================

print("\nSTEP 12 — Final validation")

train_prediction = (
    p_train_ensemble > threshold
).astype(int)

test_prediction = (
    p_test_ensemble > threshold
).astype(int)

pakistan_prediction = (
    p_pakistan_ensemble > threshold
).astype(int)


def calculate_metrics(y_true, probability, prediction):
    return {
        "auc": float(
            roc_auc_score(
                y_true,
                probability,
            )
        ),
        "recall": float(
            recall_score(
                y_true,
                prediction,
                zero_division=0,
            )
        ),
        "precision": float(
            precision_score(
                y_true,
                prediction,
                zero_division=0,
            )
        ),
        "f1": float(
            f1_score(
                y_true,
                prediction,
                zero_division=0,
            )
        ),
    }


train_metrics = calculate_metrics(
    y_train,
    p_train_ensemble,
    train_prediction,
)

test_metrics = calculate_metrics(
    y_test,
    p_test_ensemble,
    test_prediction,
)

pakistan_metrics = calculate_metrics(
    y_pakistan,
    p_pakistan_ensemble,
    pakistan_prediction,
)


print("\nVALIDATION RESULTS")
print("-" * 70)

print(
    f"Training      AUC={train_metrics['auc']:.4f} "
    f"Recall={train_metrics['recall']:.4f} "
    f"Precision={train_metrics['precision']:.4f} "
    f"F1={train_metrics['f1']:.4f}"
)

print(
    f"Internal Test AUC={test_metrics['auc']:.4f} "
    f"Recall={test_metrics['recall']:.4f} "
    f"Precision={test_metrics['precision']:.4f} "
    f"F1={test_metrics['f1']:.4f}"
)

print(
    f"Pakistan      AUC={pakistan_metrics['auc']:.4f} "
    f"Recall={pakistan_metrics['recall']:.4f} "
    f"Precision={pakistan_metrics['precision']:.4f} "
    f"F1={pakistan_metrics['f1']:.4f}"
)


# ============================================================
# STEP 13 — SAVE DEPLOYMENT ARTIFACT
# ============================================================

print("\nSTEP 13 — Saving deployment artifact")

artifact = {
    "lr_model": lr_model,
    "xgb_model": xgb_model,

    "features": FEATURES,

    "encoders": encoders,

    "imputer": imputer,

    "scaler": scaler,

    "threshold": threshold,

    "random_seed": RANDOM_SEED,

    "model_type": "LR + XGBoost probability-average ensemble",

    "target_definition": (
        "Cancer_Stage in ['Regional', 'Distant'] => 1, "
        "else 0"
    ),

    "preprocessing": [
        "LabelEncoder",
        "Median imputation",
        "StandardScaler",
    ],

    "nested_cv_metrics": nested_cv_metrics,
}


artifact_path = (
    ARTIFACT_DIR / "model_artifact.joblib"
)

joblib.dump(
    artifact,
    artifact_path,
)


# ============================================================
# STEP 14 — SAVE METRICS
# ============================================================

metrics = {
    "model_type": (
        "LR + XGBoost probability-average ensemble"
    ),

    "threshold": threshold,

    "train": train_metrics,

    "test": test_metrics,

    "pakistan": pakistan_metrics,

    "nested_cv": nested_cv_metrics,

    "train_rows": int(len(y_train)),
    "test_rows": int(len(y_test)),
    "pakistan_rows": int(len(y_pakistan)),
}


metrics_path = (
    ARTIFACT_DIR / "training_metrics.json"
)

metrics_path.write_text(
    json.dumps(
        metrics,
        indent=2,
    )
)


print("\n" + "=" * 90)
print("TRAINING COMPLETE")
print("=" * 90)

print(f"\nSaved model:   {artifact_path}")
print(f"Saved metrics: {metrics_path}")