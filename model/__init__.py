"""
PatientTriage.ai — Priority and Risk Model Package
"""

import model._bootstrap  # noqa: F401
from model.features import TriageFeaturePipeline, extract_features_from_record, FEATURE_COLUMNS
from model.predictor import TriagePredictor, ESI_NAMES, SEVERITY_WEIGHTS
from model.train import train_triage_model
from model.evaluate import evaluate_model

__all__ = [
    "TriageFeaturePipeline",
    "extract_features_from_record",
    "FEATURE_COLUMNS",
    "TriagePredictor",
    "ESI_NAMES",
    "SEVERITY_WEIGHTS",
    "train_triage_model",
    "evaluate_model"
]
