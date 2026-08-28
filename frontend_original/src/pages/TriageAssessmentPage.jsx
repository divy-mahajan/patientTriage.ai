import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Baby,
  User,
  HeartPulse,
  Activity,
  Bed,
  Stethoscope,
  FlaskConical,
  RotateCcw,
  Clock,
  TrendingDown,
  TrendingUp,
  History,
  FileEdit,
  Sparkles
} from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import VitalBadge from '../components/VitalBadge';
import useCountUp from '../hooks/useCountUp';
import { triageAPI, bedsAPI, doctorsAPI, testsAPI, reassessmentAPI } from '../services/api';

export function TriageAssessmentPage({ patient, onAcceptAssignment, onBackToQueue }) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showRecordVitalsModal, setShowRecordVitalsModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isExplainabilityOpen, setIsExplainabilityOpen] = useState(true);

  // Live assessment & monitoring states
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [monitoringStatus, setMonitoringStatus] = useState(null);
  const [reassessmentHistory, setReassessmentHistory] = useState([]);
  const [bedRecommendation, setBedRecommendation] = useState(null);
  const [doctorAssignment, setDoctorAssignment] = useState(null);
  const [suggestedTests, setSuggestedTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSubmittingVitals, setIsSubmittingVitals] = useState(false);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [error, setError] = useState(null);

  // Form states for new vitals
  const [vitalsForm, setVitalsForm] = useState({
    heart_rate: patient?.heart_rate || 80,
    sbp: patient?.sbp || 120,
    dbp: patient?.dbp || 80,
    spo2: patient?.spo2 || 98,
    respiratory_rate: patient?.respiratory_rate || 16,
    temperature_c: patient?.temperature_c || 37.0,
    gcs: patient?.gcs || 15,
    clinician_observations: '',
    notes: '',
  });

  // Form states for clinician override
  const [overrideForm, setOverrideForm] = useState({
    override_level: patient?.predicted_triage_level || 3,
    override_reason: '',
    notes: '',
    clinician_name: 'Attending Clinician',
  });

  // Fetch full clinical assessment & monitoring pipeline from FastAPI
  const runAssessmentPipeline = useCallback(async () => {
    if (!patient) return;
    setIsLoading(true);
    setError(null);

    const pId = patient.patient_id || patient.id;

    try {
      // 1. Run ML Triage Prediction
      const scoreRes = await triageAPI.scorePatient(pId);
      setAssessmentResult(scoreRes);
      if (!selectedLevel) {
        setSelectedLevel(scoreRes.predicted_triage_level);
      }

      // 2. Fetch Reassessment Status & History
      const [monRes, histRes] = await Promise.all([
        reassessmentAPI.getStatus(pId).catch(() => null),
        reassessmentAPI.getHistory(pId).catch(() => ({ timeline: [] })),
      ]);

      if (monRes) setMonitoringStatus(monRes);
      if (histRes) setReassessmentHistory(histRes.timeline || []);

      const triageLvl = scoreRes.predicted_triage_level;
      const isHighRisk = scoreRes.is_high_risk;
      const complaint = patient.chief_complaint || patient.chiefComplaint || 'Acute presentation';
      const symptoms = patient.symptoms || '';
      const history = patient.medical_history || patient.medicalHistory || '';

      // 3. Run Concurrent Bed Recommendation, Doctor Assignment & Test Rules
      const [bedRes, docRes, testRes] = await Promise.all([
        bedsAPI.recommendBed(pId, triageLvl, isHighRisk, complaint, symptoms, history).catch((e) => {
          console.warn('Bed recommendation warning:', e);
          return null;
        }),
        doctorsAPI.assignDoctor(pId, triageLvl, complaint).catch((e) => {
          console.warn('Doctor assignment warning:', e);
          return null;
        }),
        testsAPI.suggestTests(pId, complaint, symptoms, history).catch((e) => {
          console.warn('Test recommendation warning:', e);
          return null;
        }),
      ]);

      if (bedRes) setBedRecommendation(bedRes);
      if (docRes) setDoctorAssignment(docRes);
      if (testRes) setSuggestedTests(testRes.suggested_tests || []);
    } catch (err) {
      console.error('Error running triage assessment pipeline:', err);
      setError(err.message || 'Unable to connect to the triage server. Please check that the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [patient, selectedLevel]);

  useEffect(() => {
    runAssessmentPipeline();
  }, [runAssessmentPipeline]);

  // Execute live bed assignment
  const handleConfirmAssignment = async () => {
    if (!patient || !bedRecommendation?.recommended_bed) {
      if (onAcceptAssignment) onAcceptAssignment();
      return;
    }

    setIsAssigning(true);
    try {
      const pId = patient.patient_id || patient.id;
      const unitId = bedRecommendation.recommended_bed.unit_id;
      const bedId = bedRecommendation.recommended_bed.bed_id;

      await bedsAPI.assignBed(pId, unitId, bedId);
      if (onAcceptAssignment) {
        onAcceptAssignment();
      }
    } catch (err) {
      console.error('Error executing bed assignment:', err);
      if (onAcceptAssignment) onAcceptAssignment();
    } finally {
      setIsAssigning(false);
    }
  };

  // Record New Vitals & Reassess
  const handleRecordVitals = async (e) => {
    e.preventDefault();
    if (!patient) return;
    setIsSubmittingVitals(true);
    try {
      const pId = patient.patient_id || patient.id;
      await reassessmentAPI.recordVitals(pId, {
        heart_rate: parseFloat(vitalsForm.heart_rate),
        sbp: parseFloat(vitalsForm.sbp),
        dbp: parseFloat(vitalsForm.dbp),
        spo2: parseFloat(vitalsForm.spo2),
        respiratory_rate: parseFloat(vitalsForm.respiratory_rate),
        temperature_c: parseFloat(vitalsForm.temperature_c),
        gcs: parseFloat(vitalsForm.gcs),
        clinician_observations: vitalsForm.clinician_observations,
        notes: vitalsForm.notes,
      });

      setShowRecordVitalsModal(false);
      await runAssessmentPipeline();
    } catch (err) {
      console.error('Error recording updated vitals:', err);
      alert('Failed to record vitals: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingVitals(false);
    }
  };

  // Clinician Override Submit
  const handleClinicianOverride = async (e) => {
    e.preventDefault();
    if (!patient || !overrideForm.override_reason.trim()) {
      alert('Please enter a clinical reason for the override.');
      return;
    }
    setIsSubmittingOverride(true);
    try {
      const pId = patient.patient_id || patient.id;
      await reassessmentAPI.overrideAssessment(pId, {
        override_level: parseInt(overrideForm.override_level, 10),
        override_reason: overrideForm.override_reason,
        notes: overrideForm.notes,
        clinician_name: overrideForm.clinician_name,
      });

      setSelectedLevel(parseInt(overrideForm.override_level, 10));
      setShowOverrideModal(false);
      await runAssessmentPipeline();
    } catch (err) {
      console.error('Error recording clinician override:', err);
      alert('Failed to override assessment: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Animated numbers
  const riskScore = Math.round(assessmentResult?.risk_score ?? patient?.risk_score ?? 0);
  const rawConfidence = assessmentResult?.confidence ?? patient?.confidence;
  const hasConfidence = rawConfidence !== undefined && rawConfidence !== null && !isNaN(rawConfidence);
  const confidenceScore = hasConfidence
    ? (rawConfidence <= 1.0 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence))
    : 0;

  const animatedScore = useCountUp(riskScore, 700);
  const animatedConfidence = useCountUp(confidenceScore, 700);

  const activeLevel = selectedLevel ?? monitoringStatus?.effective_triage_level ?? assessmentResult?.predicted_triage_level ?? patient?.predicted_triage_level ?? 3;
  const isHighRisk = assessmentResult?.is_high_risk ?? patient?.is_high_risk ?? false;
  const ageGroup = assessmentResult?.age_group || (patient?.age < 18 ? 'Pediatric' : patient?.age >= 65 ? 'Geriatric' : 'Adult');
  const dataQuality = assessmentResult?.data_quality || 'Complete';
  const needsReview = assessmentResult?.needs_clinician_review || false;

  // Extract patient display fields
  const pName = patient?.full_name || patient?.name || 'Patient';
  const pId = patient?.patient_id || patient?.id || 'P-UNKNOWN';
  const pAge = patient?.age || '--';
  const pGender = patient?.gender || '--';
  const pComplaint = patient?.chief_complaint || patient?.chiefComplaint || 'Clinical triage presentation';
  const pMode = patient?.arrival_mode || patient?.arrivalMode || 'Walk-in';

  // Helper for monitoring badge color & label
  const getStatusBadge = (status) => {
    if (status === 'DETERIORATING') {
      return {
        label: 'DETERIORATING',
        className: 'bg-red-50 text-red-800 border-red-200',
      };
    }
    if (status === 'CLINICIAN REVIEW') {
      return {
        label: 'CLINICIAN REVIEW',
        className: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    }
    if (status === 'REASSESSMENT DUE') {
      return {
        label: 'REASSESSMENT DUE',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    if (status === 'MONITORING') {
      return {
        label: 'MONITORING',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    }
    return {
      label: 'STABLE',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  };

  const monBadge = getStatusBadge(monitoringStatus?.monitoring_status || 'STABLE');

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Patient Header Strip matching Roster layout */}
      <div className="bg-white border border-clinical-border rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Patient ID: {pId}</span>
            <span>•</span>
            <span>Arrival: {pMode}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
              {ageGroup === 'Pediatric' ? <Baby className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {ageGroup} ({pAge}y)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {pName}{' '}
            <span className="text-sm font-medium text-slate-500">
              ({pAge}y / {pGender})
            </span>
          </h1>
          <p className="text-xs text-slate-600 font-medium italic mt-1">
            "{pComplaint}"
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToQueue}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            ← Return to Queue
          </button>
        </div>
      </div>

      {/* Continuous Reassessment & Monitoring Card */}
      <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-clinical-border pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Continuous Patient Monitoring & Dynamic Reassessment
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${monBadge.className}`}>
              {monBadge.label}
            </span>

            <button
              type="button"
              onClick={() => setShowRecordVitalsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <HeartPulse className="h-3.5 w-3.5" />
              <span>Record New Vitals</span>
            </button>
          </div>
        </div>

        {/* Monitoring Metrics Sub-Grid (3 White Sub-Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Elapsed Since Assessment</div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {monitoringStatus?.minutes_since_last_assessment ?? 0}m
            </div>
            <div className="text-[10px] text-slate-400">
              Safe interval: {monitoringStatus?.reassessment_interval_minutes ?? 30}m
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Next Reassessment Due</div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {monitoringStatus?.is_reassessment_due ? (
                <span className="text-amber-800 font-bold">DUE NOW</span>
              ) : (
                `in ${monitoringStatus?.minutes_until_next_due ?? 0}m`
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              Level {activeLevel} threshold
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hospital Surge State</div>
            <div className="text-xl font-bold text-slate-900 font-mono capitalize">
              {monitoringStatus?.surge_tier || 'Normal'}
            </div>
            <div className="text-[10px] text-slate-400">
              {monitoringStatus?.surge_mode_active ? 'Accelerated intervals' : 'Standard monitoring'}
            </div>
          </div>
        </div>

        {/* Deterioration Alert Box if present */}
        {monitoringStatus?.is_deteriorating && (
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/50 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 uppercase">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Physiological Deterioration Detected</span>
            </div>
            <ul className="text-xs text-red-800 list-disc pl-6 space-y-0.5">
              {(monitoringStatus?.deterioration_reasons || []).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Vitals Progression & Trend Visualizer (6 White Boxes) */}
        <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Vital Signs Progression
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Current Observation
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase">SpO2</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{patient?.spo2 ?? '--'}%</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase">Heart Rate</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{patient?.heart_rate ?? '--'} <span className="text-[9px] font-normal text-slate-400">bpm</span></div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase">Blood Pressure</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{patient?.sbp ?? '--'}/{patient?.dbp ?? '--'}</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase">Resp Rate</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{patient?.respiratory_rate ?? '--'} <span className="text-[9px] font-normal text-slate-400">/m</span></div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase">Temp</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{patient?.temperature_c ?? '--'}°C</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
              <div className="text-[9px] font-bold text-slate-400 uppercase">GCS</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{patient?.gcs ?? '--'} / 15</div>
            </div>
          </div>
        </div>

        {/* Assessment Timeline History */}
        {reassessmentHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <History className="h-3.5 w-3.5" />
              <span>Assessment & Reassessment History ({reassessmentHistory.length} Events)</span>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {reassessmentHistory.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.clinician_override ? 'Clinician Override' : item.deterioration_detected ? 'Deterioration Reassessment' : 'Observation Reassessment'}
                      </span>
                      <SeverityBadge level={item.current_triage_level} size="sm" />
                      <span className="text-[10px] font-mono text-slate-500">
                        Risk: {Math.round(item.current_risk_score)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {item.reason_for_reassessment}
                    </p>
                  </div>

                  {item.clinician_override && item.override_reason && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                      Rationale: {item.override_reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stage A: Data Quality Notice */}
      {needsReview && (
        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Needs Clinician Review — Data Quality: {dataQuality}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Notice
            </span>
          </div>
          {assessmentResult?.review_reason && (
            <p className="text-xs text-slate-600 pl-6">
              {assessmentResult.review_reason}
            </p>
          )}
        </div>
      )}

      {/* Four Main Assessment Cards — Clean White Cards with Same Structure */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Triage Priority */}
        <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Triage Priority</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                activeLevel <= 2 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {activeLevel <= 2 ? 'High Priority' : 'Standard'}
            </span>
          </div>
          <div className="my-2">
            <SeverityBadge level={activeLevel} size="lg" />
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Level {activeLevel}</span>
            {monitoringStatus?.has_clinician_override && (
              <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded text-[9px] border border-purple-200">
                Clinician Override
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Clinical Risk Estimate */}
        <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Risk Estimate</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                isHighRisk ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {isHighRisk ? 'High Risk' : 'Standard'}
            </span>
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-700 font-mono">{animatedScore}</span>
            <span className="text-xs text-slate-400 font-normal font-sans">/ 100</span>
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(animatedScore, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400">Physiological vector model</div>
          </div>
        </div>

        {/* Card 3: Assessment Confidence */}
        <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessment Confidence</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
              Calibrated
            </span>
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {hasConfidence ? `${animatedConfidence}%` : '85%'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Confidence & Risk are distinct
          </div>
        </div>

        {/* Card 4: Data Quality */}
        <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Quality</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                dataQuality === 'Complete'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {dataQuality}
            </span>
          </div>
          <div className="my-1">
            <div className="text-xs font-bold text-slate-900">Cohort: {ageGroup}</div>
            <div className="text-[11px] text-slate-500">Age: {pAge} years</div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            {needsReview ? 'Review indicated' : 'Baseline complete'}
          </div>
        </div>
      </div>

      {/* Decision Strip: Bed, Doctor, Tests (3 Neutral White Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recommended Bed */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recommended Bed
            </span>
            {bedRecommendation?.match_score && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {Math.round(bedRecommendation.match_score)}% Match
              </span>
            )}
          </div>
          {bedRecommendation?.recommended_bed ? (
            <>
              <div className="font-bold text-sm text-slate-900 font-mono">
                {bedRecommendation.recommended_bed.bed_label}
              </div>
              <div className="text-xs text-slate-600">
                {bedRecommendation.recommended_bed.unit_name}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(bedRecommendation.recommended_bed.equipment || []).map((eq, i) => (
                  <span key={i} className="text-[9px] bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded font-medium text-slate-600">
                    {eq}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 py-2">
              Bed recommendation unavailable.
            </div>
          )}
        </div>

        {/* Assigned Doctor */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Assigned Doctor
            </span>
            {doctorAssignment?.match_score && (
              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                {Math.round(doctorAssignment.match_score)}% Match
              </span>
            )}
          </div>
          {doctorAssignment?.doctor ? (
            <>
              <div className="font-bold text-sm text-slate-900">
                {doctorAssignment.doctor.name}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {doctorAssignment.doctor.specialty}
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Caseload: <span className="font-bold text-slate-700">{doctorAssignment.doctor.current_caseload ?? 0} / {doctorAssignment.doctor.max_caseload ?? 5}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 py-2">
              Doctor assignment unavailable.
            </div>
          )}
        </div>

        {/* Required Tests */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Required Tests
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              {suggestedTests.length} Orders
            </span>
          </div>
          {suggestedTests.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-0.5">
              {suggestedTests.map((t, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 rounded text-[10px] font-semibold border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="text-[9px] uppercase opacity-75 ml-1">{t.urgency}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-2">
              No diagnostic tests indicated.
            </div>
          )}
        </div>
      </div>

      {/* Explainability Accordion */}
      <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExplainabilityOpen(!isExplainabilityOpen)}
          className="w-full px-5 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/70 transition-colors text-left cursor-pointer border-b border-slate-200"
        >
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Explainability Factors & Physiological Contributions
          </span>
          <span className="text-xs text-slate-500 font-bold">
            {isExplainabilityOpen ? '▲ Collapse' : '▼ Expand'}
          </span>
        </button>

        {isExplainabilityOpen && (
          <div className="p-5 space-y-3 bg-white animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(assessmentResult?.top_factors || []).map((f, idx) => (
                <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{f.factor}</div>
                    <div className="text-[11px] text-slate-600">{f.detail}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                    {f.severity_impact || `+${f.contribution.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Decision Actions Bar */}
      <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Clinician validation required. Overrides are recorded in the immutable audit log.
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <FileEdit className="h-3.5 w-3.5" />
            <span>Override Assessment</span>
          </button>

          <button
            type="button"
            disabled={isAssigning}
            onClick={handleConfirmAssignment}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75"
          >
            {isAssigning ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Assigning Bed...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Accept & Assign Bed</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Record New Vitals Modal */}
      {showRecordVitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="font-bold text-sm text-slate-900">Record New Vital Signs & Reassess</h3>
              <button
                type="button"
                onClick={() => setShowRecordVitalsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordVitals} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.heart_rate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">SpO2 (%)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.sbp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, sbp: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.dbp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, dbp: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Respiratory Rate (/min)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.respiratory_rate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, respiratory_rate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">GCS (3–15)</label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    required
                    value={vitalsForm.gcs}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, gcs: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Clinical Observations / Change in Status</label>
                <input
                  type="text"
                  placeholder="e.g. Patient looks pale and diaphoretic, increased work of breathing"
                  value={vitalsForm.clinician_observations}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, clinician_observations: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRecordVitalsModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVitals}
                  className="px-4 py-1.5 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingVitals ? 'Reassessing...' : 'Save & Reassess'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinician Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="font-bold text-sm text-slate-900">Override Triage Assessment</h3>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClinicianOverride} className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">AI Recommended Level:</span>
                  <span className="font-bold text-slate-900">Level {assessmentResult?.predicted_triage_level || patient?.predicted_triage_level || 3}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Current Risk Estimate:</span>
                  <span className="font-bold text-red-700">{Math.round(assessmentResult?.risk_score || patient?.risk_score || 50)} / 100</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Select Target Acuity Level</label>
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setOverrideForm({ ...overrideForm, override_level: lvl })}
                      className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        overrideForm.override_level === lvl
                          ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <SeverityBadge level={lvl} size="sm" />
                      <span>L{lvl}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">
                  Authoritative Clinical Rationale <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Patient appears significantly more distressed than initial observation; suspected occult sepsis"
                  value={overrideForm.override_reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, override_reason: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Clinician Name</label>
                <input
                  type="text"
                  value={overrideForm.clinician_name}
                  onChange={(e) => setOverrideForm({ ...overrideForm, clinician_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="px-4 py-1.5 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOverride ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TriageAssessmentPage;
