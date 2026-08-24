from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score, precision_recall_curve, f1_score, recall_score, precision_score
from xgboost import XGBClassifier

RANDOM_SEED = 42
DATASET = Path('colorectal_cancer_dataset_1_kaggle.csv')
ARTIFACT_DIR = Path('model')
ARTIFACT_DIR.mkdir(exist_ok=True)

FEATURES = [
    'Age','Gender','Smoking_History','Alcohol_Consumption','Obesity_BMI',
    'Diabetes','Inflammatory_Bowel_Disease','Family_History','Diet_Risk',
    'Physical_Activity','Abdominal Pain','Bleeding PR','Weight Loss','Bowel Change',
    'Tenesmus','Anemia related symptoms','Abdominal Mass Palpable','PR Exam Suspicious',
    'ECOG status','Pallor','Hemoglobin','FIT/FOBT','CEA_Level','Liver function Test',
    'serum Albumin'
]
TARGET = 'Cancer_Stage'
COUNTRY = 'Country'

if not DATASET.exists():
    raise FileNotFoundError(f'Missing {DATASET}. Copy the dataset next to train_model.py.')

df = pd.read_csv(DATASET)
df.columns = df.columns.str.strip()
missing = [c for c in FEATURES + [TARGET, COUNTRY] if c not in df.columns]
if missing:
    raise ValueError(f'Missing required columns: {missing}')

# Same target definition as the supplied CPV4 code.
y = df[TARGET].apply(lambda x: 1 if x in ['Regional', 'Distant'] else 0)
X = df[FEATURES].copy()

# Same geographic split used by the supplied code: Pakistan is hold-out only.
pak_mask = df[COUNTRY].eq('Pakistan')
X_global, X_pak = X.loc[~pak_mask].copy(), X.loc[pak_mask].copy()
y_global, y_pak = y.loc[~pak_mask].copy(), y.loc[pak_mask].copy()
X_train, X_test, y_train, y_test = train_test_split(
    X_global, y_global, test_size=0.2, stratify=y_global, random_state=RANDOM_SEED
)

# Fit encoders on training data only, exactly as CPV4 does.
encoders = {}
for col in X_train.select_dtypes(include=['object']).columns:
    le = LabelEncoder()
    X_train[col] = le.fit_transform(X_train[col].astype(str))
    X_test[col] = le.transform(X_test[col].astype(str))
    # CPV4 maps unseen Pakistan categories to 0.
    try:
        X_pak[col] = le.transform(X_pak[col].astype(str))
    except ValueError:
        known = set(le.classes_)
        X_pak[col] = X_pak[col].astype(str).map(lambda v: le.transform([v])[0] if v in known else 0)
    encoders[col] = le

imputer = SimpleImputer(strategy='median')
X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=FEATURES)
X_test = pd.DataFrame(imputer.transform(X_test), columns=FEATURES)
X_pak = pd.DataFrame(imputer.transform(X_pak), columns=FEATURES)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)
X_pak_s = scaler.transform(X_pak)

# XGBoost configuration used by the CPV4 standalone comparison/base learner.
model = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=RANDOM_SEED,
    eval_metric='logloss'
)
model.fit(X_train_s, y_train, verbose=False)

p_train = model.predict_proba(X_train_s)[:, 1]
p_test = model.predict_proba(X_test_s)[:, 1]
p_pak = model.predict_proba(X_pak_s)[:, 1]

# CPV4's deployment concept: choose the F1-maximizing threshold on training data.
precision, recall, thresholds = precision_recall_curve(y_train, p_train)
f1 = 2 * precision * recall / (precision + recall + 1e-10)
i = int(np.argmax(f1))
threshold = float(thresholds[i]) if i < len(thresholds) else 0.5

artifact = {
    'model': model,
    'features': FEATURES,
    'encoders': encoders,
    'imputer': imputer,
    'scaler': scaler,
    'threshold': threshold,
    'random_seed': RANDOM_SEED,
    'model_type': 'XGBoost Standalone',
    'target_definition': "Cancer_Stage in ['Regional', 'Distant'] => 1, else 0",
}
joblib.dump(artifact, ARTIFACT_DIR / 'model_artifact.joblib')

metrics = {
    'threshold': threshold,
    'train_auc': float(roc_auc_score(y_train, p_train)),
    'test_auc': float(roc_auc_score(y_test, p_test)),
    'pakistan_auc': float(roc_auc_score(y_pak, p_pak)),
    'pakistan_recall': float(recall_score(y_pak, p_pak > threshold)),
    'pakistan_precision': float(precision_score(y_pak, p_pak > threshold)),
    'pakistan_f1': float(f1_score(y_pak, p_pak > threshold)),
    'train_rows': int(len(y_train)),
    'test_rows': int(len(y_test)),
    'pakistan_rows': int(len(y_pak)),
}
(ARTIFACT_DIR / 'training_metrics.json').write_text(json.dumps(metrics, indent=2))
print(json.dumps(metrics, indent=2))
print('\nSaved: model/model_artifact.joblib')
