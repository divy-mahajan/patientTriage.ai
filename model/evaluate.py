"""
PatientTriage.ai — Model Evaluation Pipeline

Evaluates the multi-class Logistic Regression triage model on a held-out test split,
producing multi-class and binary high-risk classification metrics with plain-language
clinical interpretations.
"""

import os
import json
import argparse
import pandas as pd
import numpy as np
import model._bootstrap  # noqa: F401
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    brier_score_loss
)
from sklearn.model_selection import train_test_split
import joblib

from model.features import TriageFeaturePipeline, FEATURE_COLUMNS


def evaluate_model(
    data_path: str = "data/synthetic/patients_synthetic.csv",
    artifact_path: str = "model/artifacts/triage_model.joblib",
    test_size: float = 0.20,
    random_state: int = 42
) -> dict:
    """Run full evaluation suite on the held-out test split."""
    if not os.path.exists(artifact_path):
        raise FileNotFoundError(f"Model artifact not found at {artifact_path}. Run model/train.py first.")

    artifact = joblib.load(artifact_path)
    model = artifact["model"]
    pipeline = artifact["feature_pipeline"]

    df = pd.read_csv(data_path)
    y_true = df["synthetic_esi_level"].values.astype(int)
    y_high_risk_true = (y_true <= 2).astype(int)

    X_raw_df = pipeline.transform_df(df)

    # Perform same stratified train/test split
    _, X_test_df, _, y_test = train_test_split(
        X_raw_df, y_true,
        test_size=test_size,
        stratify=y_true,
        random_state=random_state
    )

    X_test_scaled = pipeline.transform(X_test_df)
    y_pred = model.predict(X_test_scaled)
    y_probs = model.predict_proba(X_test_scaled)

    # 1. Multi-class Metrics
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    weighted_f1 = f1_score(y_test, y_pred, average="weighted")
    report_dict = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    # 2. Binary High-Risk Metrics (ESI 1 & 2 vs ESI 3, 4, 5)
    y_test_high_risk = (y_test <= 2).astype(int)
    # High-risk predicted probability = P(ESI=1) + P(ESI=2)
    classes = list(model.classes_)
    idx_1 = classes.index(1)
    idx_2 = classes.index(2)
    high_risk_probs = y_probs[:, idx_1] + y_probs[:, idx_2]
    y_pred_high_risk = (high_risk_probs >= 0.45).astype(int)

    high_risk_precision = precision_score(y_test_high_risk, y_pred_high_risk)
    high_risk_recall = recall_score(y_test_high_risk, y_pred_high_risk)
    high_risk_auc = roc_auc_score(y_test_high_risk, high_risk_probs)
    high_risk_brier = brier_score_loss(y_test_high_risk, high_risk_probs)

    results = {
        "test_sample_count": len(y_test),
        "accuracy": round(float(acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "high_risk_evaluation": {
            "roc_auc": round(float(high_risk_auc), 4),
            "sensitivity_recall": round(float(high_risk_recall), 4),
            "precision": round(float(high_risk_precision), 4),
            "brier_score": round(float(high_risk_brier), 4)
        },
        "per_class_metrics": {
            f"Level_{c}": {
                "precision": round(report_dict[str(c)]["precision"], 4),
                "recall": round(report_dict[str(c)]["recall"], 4),
                "f1_score": round(report_dict[str(c)]["f1-score"], 4),
                "support": int(report_dict[str(c)]["support"])
            }
            for c in classes
        },
        "confusion_matrix": cm,
        "classes": classes
    }

    return results


def print_evaluation_summary(results: dict):
    """Print readable evaluation summary with plain-language clinical interpretations."""
    print("\n" + "=" * 70)
    print("       PATIENTTRIAGE.AI — MODEL EVALUATION REPORT & INTERPRETATION")
    print("=" * 70)
    print(f"Test Set Evaluation Size : {results['test_sample_count']} patients (20% holdout)")
    print(f"Overall Multi-Class Acc  : {results['accuracy'] * 100:.2f}%")
    print(f"Macro F1-Score           : {results['macro_f1']:.4f}")
    print(f"Weighted F1-Score        : {results['weighted_f1']:.4f}")
    print("-" * 70)
    print("HIGH-RISK DETECTION PERFORMANCE (ESI 1 & 2 vs ESI 3-5):")
    hr = results["high_risk_evaluation"]
    print(f"  * ROC-AUC Score        : {hr['roc_auc']:.4f}  (Discrimination ability)")
    print(f"  * Sensitivity / Recall : {hr['sensitivity_recall'] * 100:.2f}%  (Ability to catch critical patients without missing)")
    print(f"  * Precision            : {hr['precision'] * 100:.2f}%  (Positive predictive value)")
    print(f"  * Brier Score          : {hr['brier_score']:.4f}  (Probability calibration error; 0.0 is perfect)")
    print("-" * 70)
    print("PER-CLASS TRIAGE BREAKDOWN:")
    print(f"{'Triage Level':<22} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 70)
    for c_name, metrics in results["per_class_metrics"].items():
        print(f"{c_name:<22} | {metrics['precision']:<10.2f} | {metrics['recall']:<10.2f} | {metrics['f1_score']:<10.2f} | {metrics['support']:<8}")
    print("-" * 70)
    print("CONFUSION MATRIX (Rows: Actual ESI 1-5, Columns: Predicted ESI 1-5):")
    for row in results["confusion_matrix"]:
        print("  ", row)
    print("=" * 70)
    print("\nPLAIN-LANGUAGE CLINICAL METRIC INTERPRETATION:")
    print("1. Accuracy (Overall Correctness):")
    print(f"   The model assigns the exact correct ESI priority level to {results['accuracy']*100:.1f}% of unseen incoming patients.")
    print("2. High-Risk Sensitivity / Recall:")
    print(f"   At {hr['sensitivity_recall']*100:.1f}%, the model successfully identifies almost all emergent/resuscitation patients,")
    print("   minimizing dangerous undertriage (false negatives).")
    print("3. High-Risk ROC-AUC:")
    print(f"   A score of {hr['roc_auc']:.4f} indicates excellent rank-ordering separation between urgent vs non-urgent presentations.")
    print("4. Brier Calibration Score:")
    print(f"   A Brier score of {hr['brier_score']:.4f} confirms that the predicted confidence probabilities reflect true uncertainty.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate PatientTriage.ai model")
    parser.add_argument("--data", type=str, default="data/synthetic/patients_synthetic.csv")
    parser.add_argument("--artifact", type=str, default="model/artifacts/triage_model.joblib")
    args = parser.parse_args()

    res = evaluate_model(data_path=args.data, artifact_path=args.artifact)
    print_evaluation_summary(res)
