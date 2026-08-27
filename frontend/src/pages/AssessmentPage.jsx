import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Bed,
  Stethoscope,
  RefreshCw,
  Edit3,
  ArrowRight,
  Info,
  Clock,
  FlaskConical,
  Activity
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { triageApi } from '../api/triageApi';
import { testsApi } from '../api/testsApi';
import { patientsApi } from '../api/patientsApi';
import SeverityBadge from '../components/common/SeverityBadge';
import ConfidenceGauge from '../components/common/ConfidenceGauge';
import VitalsPills from '../components/common/VitalsPills';
import ExplainabilityFactor from '../components/assessment/ExplainabilityFactor';
import ClassProbabilityBar from '../components/assessment/ClassProbabilityBar';
import DiagnosticTestPanel from '../components/assessment/DiagnosticTestPanel';
import TriageOverrideModal from '../components/assessment/TriageOverrideModal';

export const AssessmentPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patients, addNotification } = useHospital();

  const [activePatient, setActivePatient] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [testRecommendations, setTestRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [confirmedLevel, setConfirmedLevel] = useState(null);
  const [overrideData, setOverrideData] = useState(null);

  // Load target patient
  useEffect(() => {
    const loadTarget = async () => {
      setLoading(true);
      try {
        let p = null;
        if (patientId) {
          p = patients.find(item => item.patient_id === patientId);
          if (!p) {
            // Fetch from API directly
            p = await patientsApi.getPatient(patientId);
          }
        } else if (patients.length > 0) {
          p = patients[0];
        }

        setActivePatient(p);
        if (p) {
          await runAssessment(p);
        }
      } catch (err) {
        console.error('Error loading patient for assessment:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTarget();
  }, [patientId, patients]);

  const runAssessment = async (patientObj) => {
    try {
      setEvaluating(true);
      // Run ML score
      const scoreRes = await triageApi.scorePatient({
        patientId: patientObj.patient_id
      });
      setAssessment(scoreRes);
      setConfirmedLevel(scoreRes.predicted_triage_level);

      // Run Rule-based Test recommendations
      const testRes = await testsApi.recommendTests({
        patient_id: patientObj.patient_id,
        chief_complaint: patientObj.chief_complaint,
        symptoms: patientObj.symptoms || '',
        medical_history: patientObj.medical_history || '',
        age: patientObj.age
      });
      setTestRecommendations(testRes);
    } catch (err) {
      console.error('Triage scoring error:', err);
      addNotification('Scoring Failed', err.message, 'critical');
    } finally {
      setEvaluating(false);
    }
  };

  const handleConfirmTriage = () => {
    addNotification(
      'Triage Confirmed',
      `Level ${confirmedLevel} acuity validated for ${activePatient.full_name}`,
      'success'
    );
  };

  const handleOverrideTriage = ({ targetLevel, rationale }) => {
    setConfirmedLevel(targetLevel);
    setOverrideData({ targetLevel, rationale });
    addNotification(
      'Acuity Overridden',
      `Triage acuity manually updated to Level ${targetLevel}. Rationale: "${rationale}"`,
      'warning'
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-clinical-primary-container mx-auto" />
        <p className="text-sm font-bold text-slate-700">Loading patient triage record...</p>
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="rounded-xl border border-clinical-border bg-white p-12 text-center space-y-4">
        <Sparkles className="h-10 w-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Patient Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Please select a patient from the Triage Overview queue or create a new patient intake.
        </p>
        <button
          onClick={() => navigate('/intake')}
          className="rounded-lg bg-clinical-primary-container text-white px-4 py-2 text-xs font-bold hover:bg-clinical-primary transition"
        >
          New Patient Intake
        </button>
      </div>
    );
  }

  const effectiveLevel = confirmedLevel || assessment?.predicted_triage_level || 3;

  return (
    <div className="space-y-6">
      {/* Patient Selector Dropdown Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-clinical-border pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            AI Triage & Decision Review
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary">
            {activePatient.full_name}
          </h1>
        </div>

        {/* Patient Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Inspect:</span>
          <select
            value={activePatient.patient_id}
            onChange={(e) => navigate(`/assessment/${encodeURIComponent(e.target.value)}`)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.full_name} ({p.patient_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Summary Hero Card */}
      <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {activePatient.patient_id}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs font-semibold text-slate-700">
                {activePatient.age} years old · {activePatient.gender} · {activePatient.arrival_mode}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1">
              "{activePatient.chief_complaint}"
            </p>
          </div>

          <SeverityBadge level={effectiveLevel} size="lg" showWait={true} />
        </div>

        {/* Vitals Summary */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
          <VitalsPills
            heartRate={activePatient.heart_rate}
            sbp={activePatient.sbp}
            dbp={activePatient.dbp}
            spo2={activePatient.spo2}
            respiratoryRate={activePatient.respiratory_rate}
            temperatureC={activePatient.temperature_c}
            gcs={activePatient.gcs}
            size="md"
          />
          <div className="text-right text-[11px] text-slate-500 font-mono">
            Intake: {new Date(activePatient.arrival_timestamp || activePatient.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* AI Assessment & Explainability Bento Grid */}
      {assessment && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: AI Risk Score, Acuity Banner & Confidence Gauge */}
          <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary">
                  ML Prediction Result
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 border border-blue-200">
                  <Sparkles className="h-3 w-3" />
                  Interpretable Model
                </span>
              </div>

              {/* Acuity Level Hero Banner */}
              <div className={`rounded-xl border p-4 text-center space-y-1 ${
                effectiveLevel === 1
                  ? 'border-red-400 bg-red-50 text-red-950'
                  : effectiveLevel === 2
                  ? 'border-orange-400 bg-orange-50 text-orange-950'
                  : effectiveLevel === 3
                  ? 'border-amber-400 bg-amber-50 text-amber-950'
                  : effectiveLevel === 4
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                  : 'border-slate-300 bg-slate-100 text-slate-900'
              }`}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-75">
                  Assigned Triage Priority
                </span>
                <h3 className="text-xl sm:text-2xl font-black">
                  LEVEL {effectiveLevel} — {assessment.triage_level_name?.split('—')[1]?.trim() || 'Emergent'}
                </h3>
                {overrideData && (
                  <span className="inline-block mt-1 text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded text-red-800 border border-red-200">
                    Clinician Override Applied
                  </span>
                )}
              </div>

              {/* High Risk Flag Warning */}
              {assessment.is_high_risk && (
                <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2.5 flex items-center gap-2 text-xs font-bold text-red-900 animate-pulse">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                  <span>HIGH-RISK ALERT: Immediate clinical oversight recommended</span>
                </div>
              )}
            </div>

            {/* Confidence & Continuous Risk Score */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <ConfidenceGauge value={assessment.confidence} size={96} />
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Risk Score
                </span>
                <span className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
                  {assessment.risk_score?.toFixed(1) || 0}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">/ 100 Scale</span>
              </div>
            </div>

            {/* Clinician Decision Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmTriage}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white py-2.5 px-4 text-xs font-extrabold hover:bg-emerald-700 transition shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Level {effectiveLevel} Triage
              </button>

              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 py-2 px-4 text-xs font-bold hover:bg-slate-50 transition"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Override AI Recommendation
              </button>

              <button
                type="button"
                onClick={() => navigate('/beds', { state: { selectedPatient: activePatient } })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-clinical-primary-container text-white py-2.5 px-4 text-xs font-extrabold hover:bg-clinical-primary transition shadow-xs"
              >
                <Bed className="h-4 w-4" />
                Proceed to Bed Match
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Column 2 & 3: Explainability Factors, Probabilities & Diagnostic Tests */}
          <div className="lg:col-span-2 space-y-5">
            {/* Top Contributing Physiological Factors Panel */}
            <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-clinical-border pb-3">
                <div>
                  <h3 className="text-sm font-bold text-clinical-text-primary">
                    Explainability & Clinical Contributing Factors
                  </h3>
                  <p className="text-xs text-clinical-text-secondary">
                    Local model feature weights driving this risk prediction.
                  </p>
                </div>
                <span className="font-mono text-[10px] text-slate-500 font-bold">
                  {assessment.top_factors?.length || 0} Factors Identified
                </span>
              </div>

              {/* Factors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {assessment.top_factors?.map((factor, idx) => (
                  <ExplainabilityFactor
                    key={idx}
                    factor={factor.factor}
                    detail={factor.detail}
                    contribution={factor.contribution}
                    severityImpact={factor.severity_impact}
                  />
                ))}
              </div>
            </div>

            {/* Probability Distribution Bar */}
            <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs">
              <ClassProbabilityBar
                probabilities={assessment.class_probabilities}
                predictedLevel={effectiveLevel}
              />
            </div>

            {/* Suggested Diagnostic Test Panel */}
            {testRecommendations && (
              <DiagnosticTestPanel
                matchedCategory={testRecommendations.matched_complaint_category}
                suggestedTests={testRecommendations.suggested_tests}
                isRuleBased={testRecommendations.is_rule_based}
                onOrderTests={(ordered) => {
                  addNotification(
                    'Diagnostic Panel Ordered',
                    `Ordered ${ordered.length} diagnostic test(s) for ${activePatient.full_name}`,
                    'info'
                  );
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Override Modal */}
      <TriageOverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        currentPredictedLevel={assessment?.predicted_triage_level || 2}
        patientName={activePatient.full_name}
        onConfirmOverride={handleOverrideTriage}
      />
    </div>
  );
};

export default AssessmentPage;
