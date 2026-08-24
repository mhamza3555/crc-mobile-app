from pathlib import Path
import joblib
import pandas as pd


class Predictor:
    def __init__(self, artifact_path="model/model_artifact.joblib"):
        self.artifact_path = Path(artifact_path)
        self.artifact = None
        self.is_loaded = False

        if self.artifact_path.exists():
            self.artifact = joblib.load(self.artifact_path)
            self.is_loaded = True

    def predict(self, patient_data):

        # ---------------------------------------------------------
        # Demo mode if the trained artifact is not available
        # ---------------------------------------------------------
        if not self.is_loaded:
            return {
                "mode": "demo",
                "risk": "HIGH",
                "probability": 0.84,
                "top_factors": [],
                "message": (
                    "Demo response only — run train_model.py "
                    "and connect the validated model before use."
                ),
            }

        # ---------------------------------------------------------
        # 1. Get the exact feature order used during training
        # ---------------------------------------------------------
        features = self.artifact["features"]

        normalized_patient_data = dict(patient_data)

        if "Hemoglobin " in features and "Hemoglobin" in normalized_patient_data:
            normalized_patient_data["Hemoglobin "] = normalized_patient_data.pop("Hemoglobin")

        missing = [
            feature
            for feature in features
            if feature not in normalized_patient_data
        ]

        if missing:
            raise ValueError(
                f"Missing patient features: {missing}"
            )
        # Build one-row DataFrame in the exact feature order
        row = {
            feature: normalized_patient_data[feature]
            for feature in features
        }
        X = pd.DataFrame(
            [row],
            columns=features,
            dtype=object
        )
        # ---------------------------------------------------------
        # 2. Apply the SAME categorical encoding
        # ---------------------------------------------------------
        for col, encoder in self.artifact["encoders"].items():

            value = str(X.at[0, col])

            known_classes = set(
                encoder.classes_
            )

            if value in known_classes:
                X.at[0, col] = encoder.transform(
                    [value]
                )[0]
            else:
                # Same unseen-category behavior used during training
                X.at[0, col] = 0

        # ---------------------------------------------------------
        # 3. Convert all values to numeric
        # ---------------------------------------------------------
        for col in features:
            X[col] = pd.to_numeric(
                X[col],
                errors="coerce"
            )

        # ---------------------------------------------------------
        # 4. SAME median imputation
        # ---------------------------------------------------------
        X = pd.DataFrame(
            self.artifact["imputer"].transform(X),
            columns=features,
        )

        # ---------------------------------------------------------
        # 5. SAME StandardScaler
        # ---------------------------------------------------------
        X_scaled = self.artifact["scaler"].transform(X)

        # ---------------------------------------------------------
        # 6. LR + XGBoost ensemble
        #
        # This is the important change:
        #
        # LR probability
        #       +
        # XGBoost probability
        #       ----------------
        #              2
        # ---------------------------------------------------------

        lr_probability = float(
            self.artifact["lr_model"]
            .predict_proba(X_scaled)[0, 1]
        )

        xgb_probability = float(
            self.artifact["xgb_model"]
            .predict_proba(X_scaled)[0, 1]
        )

        probability = (
            lr_probability + xgb_probability
        ) / 2.0

        # ---------------------------------------------------------
        # 7. Apply the SAME optimized threshold
        # ---------------------------------------------------------
        threshold = float(
            self.artifact["threshold"]
        )

        risk = (
            "HIGH"
            if probability > threshold
            else "LOW"
        )

        # ---------------------------------------------------------
        # 8. API response
        # ---------------------------------------------------------
        return {
            "mode": "model",
            "risk": risk,
            "probability": probability,
            "threshold": threshold,
            "message": (
                "Model output only. "
                "This prototype is not a medical diagnosis."
            ),
        }