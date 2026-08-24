from pathlib import Path
import numpy as np

class Predictor:
    def __init__(self, artifact_path='model/model_artifact.joblib'):
        self.artifact_path = Path(artifact_path)
        self.artifact = None
        self.is_loaded = False
        if self.artifact_path.exists():
            import joblib
            self.artifact = joblib.load(self.artifact_path)
            self.is_loaded = True

    def predict(self, patient_data):
        if not self.is_loaded:
            return {
                'mode': 'demo',
                'risk': 'HIGH',
                'probability': 0.84,
                'top_factors': [],
                'message': 'Demo response only — run train_model.py and connect the validated model before use.'
            }

        import pandas as pd

        features = self.artifact['features']

        # Build input row
        row = {f: patient_data[f] for f in features}
        X = pd.DataFrame([row], columns=features)

        # Convert categorical features using the encoders
        for col, encoder in self.artifact['encoders'].items():
            value = str(X.at[0, col])

            if value in set(encoder.classes_):
                X[col] = encoder.transform([value])
            else:
                X[col] = [0]

        # Make sure everything is numeric before imputation
        for col in features:
            X[col] = pd.to_numeric(X[col], errors='coerce')

        # Apply the same preprocessing used during training
        X = pd.DataFrame(
            self.artifact['imputer'].transform(X),
            columns=features
        )

        X = self.artifact['scaler'].transform(X)

        probability = float(
            self.artifact['model'].predict_proba(X)[0, 1]
        )

        threshold = float(self.artifact['threshold'])
        risk = 'HIGH' if probability > threshold else 'LOW'

        return {
            'mode': 'model',
            'risk': risk,
            'probability': probability,
            'threshold': threshold,
            'message': 'Model output only. This prototype is not a medical diagnosis.'
        }