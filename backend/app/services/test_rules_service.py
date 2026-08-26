"""
PatientTriage.ai — Rule-Based Diagnostic Test Recommendation Service

Strictly rule-based, deterministic lookup engine that suggests standard diagnostic test panels
(Labs, Imaging, ECG, Point-of-Care) based on clinical chief complaints and symptoms.

STRICT CONSTRAINTS:
Does NOT use ML — transparent clinical lookup from config/test_rules_matrix.json.
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.app.core.config import settings
from backend.app.schemas.test_order import (
    TestRecommendRequest,
    TestRecommendResponse,
    SuggestedTestItem
)


class DiagnosticRulesService:
    def __init__(self):
        self._rules_matrix: List[Dict[str, Any]] = []
        self.load_rules()

    def load_rules(self):
        """Load test rules matrix from JSON configuration."""
        path = settings.test_rules_path
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._rules_matrix = data.get("rules", [])
        else:
            self._rules_matrix = []

    def recommend_tests(self, request: TestRecommendRequest) -> TestRecommendResponse:
        """
        Evaluate patient complaints and symptoms against transparent clinical test panels.
        """
        text_corpus = (
            request.chief_complaint + " " +
            (request.symptoms or "") + " " +
            (request.medical_history or "")
        ).lower()

        matched_category = "General Medical Workup"
        suggested: List[SuggestedTestItem] = []

        # Find best matching rule by keyword match density
        best_rule = None
        max_matches = 0

        for rule in self._rules_matrix:
            matches = sum(1 for kw in rule.get("keywords", []) if kw.lower() in text_corpus)
            if matches > max_matches:
                max_matches = matches
                best_rule = rule

        if best_rule and max_matches > 0:
            matched_category = best_rule.get("complaint_category", "Specialized Panel")
            cautions = best_rule.get("contraindications_or_cautions", "")
            for t in best_rule.get("suggested_tests", []):
                suggested.append(
                    SuggestedTestItem(
                        code=t["code"],
                        name=t["name"],
                        category=t.get("category", "General"),
                        urgency=t.get("urgency", "Routine"),
                        typical_tat_minutes=t.get("typical_tat_minutes", 30),
                        rationale=t.get("rationale", f"Standard clinical test panel for {matched_category}. {cautions}".strip())
                    )
                )
        else:
            # Standard Baseline Panel fallback
            matched_category = "Standard Emergency Baseline Panel"
            suggested = [
                SuggestedTestItem(
                    code="LAB-CBC",
                    name="Complete Blood Count (CBC)",
                    category="Laboratory",
                    urgency="Routine",
                    typical_tat_minutes=30,
                    rationale="Baseline infection and hemoglobin assessment"
                ),
                SuggestedTestItem(
                    code="LAB-BMP",
                    name="Basic Metabolic Panel (BMP)",
                    category="Laboratory",
                    urgency="Routine",
                    typical_tat_minutes=35,
                    rationale="Electrolytes, renal function, and blood glucose check"
                ),
                SuggestedTestItem(
                    code="ECG-12LEAD",
                    name="12-Lead Electrocardiogram (ECG)",
                    category="Cardiovascular",
                    urgency="Routine",
                    typical_tat_minutes=10,
                    rationale="Baseline cardiac rhythm verification"
                )
            ]

        return TestRecommendResponse(
            patient_id=request.patient_id,
            matched_complaint_category=matched_category,
            suggested_tests=suggested,
            is_rule_based=True,
            total_tests_recommended=len(suggested),
            evaluated_at=datetime.utcnow()
        )


test_rules_service = DiagnosticRulesService()
