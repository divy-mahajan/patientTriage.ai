"""
PatientTriage.ai — Interpretable Priority / Risk Model Trainer

Trains an interpretable multi-class Logistic Regression model to predict
triage acuity (ESI levels 1 to 5) from physiological vitals, clinical observations,
and contextual hospital capacity.
"""

import os
import argparse
from datetime import datetime
import pandas as pd
import numpy as np
import model._bootstrap  # noqa: F401
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import joblib

from model.features import TriageFeaturePipeline, FEATURE_COLUMNS


def train_triage_model(
    data_path: str = "data/synthetic/patients_synthetic.csv",
    artifact_path: str = "model/artifacts/triage_model.joblib",
    test_size: float = 0.20,
    random_state: int = 42
) -> dict:
    """Train and persist the interpretable triage priority model."""
    print("=" * 60)
    print("PatientTriage.ai — Model Training Pipeline (Logistic Regression)")
    print("=" * 60)

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Training dataset not found at: {data_path}")

    # 1. Load raw dataset
    df = pd.read_csv(data_path)
    print(f"[DATA] Loaded {len(df)} patient records from {data_path}")

    # Target variable: synthetic_esi_level (1 to 5)
    y = df["synthetic_esi_level"].values.astype(int)

    # 2. Extract and engineer input features (strictly excluding labels/targets)
    pipeline = TriageFeaturePipeline()
    X_raw_df = pipeline.transform_df(df)
    print(f"[FEATURES] Extracted {X_raw_df.shape[1]} clinical & contextual features:")
    for col in FEATURE_COLUMNS:
        print(f"  - {col}")

    # 3. Stratified Train / Test Split
    X_train_df, X_test_df, y_train, y_test = train_test_split(
        X_raw_df, y,
        test_size=test_size,
        stratify=y,
        random_state=random_state
    )
    print(f"[SPLIT] Train set: {len(X_train_df)} samples | Test set: {len(X_test_df)} samples (Stratified, seed={random_state})")

    # 4. Standardize numerical features using training set parameters
    X_train_scaled = pipeline.fit_transform(X_train_df)
    X_test_scaled = pipeline.transform(X_test_df)

    # 5. Fit Interpretable Multi-Class Logistic Regression Model
    model = LogisticRegression(
        penalty="l2",
        C=1.0,
        class_weight="balanced",
        multi_class="multinomial",
        solver="lbfgs",
        max_iter=1000,
        random_state=random_state
    )
    model.fit(X_train_scaled, y_train)

    # 6. Evaluate initial training/test accuracy
    train_acc = float(model.score(X_train_scaled, y_train))
    test_acc = float(model.score(X_test_scaled, y_test))
    print(f"[ACCURACY] Training Accuracy: {train_acc * 100:.2f}% | Test Accuracy: {test_acc * 100:.2f}%")

    # 7. Package and Serialize Artifacts
    os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
    artifact = {
        "model": model,
        "feature_pipeline": pipeline,
        "feature_names": FEATURE_COLUMNS,
        "classes": list(model.classes_),
        "metadata": {
            "trained_at": datetime.utcnow().isoformat() + "Z",
            "model_type": "LogisticRegression(multinomial, l2)",
            "num_samples": len(df),
            "train_samples": len(X_train_df),
            "test_samples": len(X_test_df),
            "train_accuracy": train_acc,
            "test_accuracy": test_acc,
            "random_state": random_state
        }
    }

    joblib.dump(artifact, artifact_path)
    print(f"[SUCCESS] Serialized trained model artifact to: {artifact_path}")
    print("=" * 60)

    return {
        "artifact_path": artifact_path,
        "train_accuracy": train_acc,
        "test_accuracy": test_acc,
        "classes": list(model.classes_),
        "X_test_df": X_test_df,
        "y_test": y_test
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PatientTriage.ai baseline model")
    parser.add_argument("--data", type=str, default="data/synthetic/patients_synthetic.csv")
    parser.add_argument("--artifact", type=str, default="model/artifacts/triage_model.joblib")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    train_triage_model(data_path=args.data, artifact_path=args.artifact, random_state=args.seed)
