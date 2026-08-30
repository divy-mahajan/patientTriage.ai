import React, { useState, useEffect, useCallback } from 'react';
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
  Activity,
  HeartPulse,
  TrendingDown,
  History,
  FileEdit,
  User,
  Plus
} from 'lucide-react';
import { triageApi } from '../api/triageApi';
import { patientsApi } from '../api/patientsApi';
import { bedsApi } from '../api/bedsApi';
import { doctorsApi } from '../api/doctorsApi';
import { testsApi } from '../api/testsApi';
import { reassessmentApi } from '../api/reassessmentApi';
import { treatmentsApi } from '../api/treatmentsApi';
import SeverityBadge from '../components/common/SeverityBadge';
import VitalsPills from '../components/common/VitalsPills';
import ConfidenceGauge from '../components/common/ConfidenceGauge';

export const AssessmentPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [activePatient, setActivePatient] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [monitoringStatus, setMonitoringStatus] = useState(null);
  const [reassessmentHistory, setReassessmentHistory] = useState([]);
  const [bedRecommendation, setBedRecommendation] = useState(null);
  const [doctorAssignment, setDoctorAssignment] = useState(null);
  const [suggestedTests, setSuggestedTests] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showRecordVitalsModal, setShowRecordVitalsModal] = useState(false);
  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for new vitals
  const [vitalsForm, setVitalsForm] = useState({
    heart_rate: 80,
    sbp: 120,
    dbp: 80,
    spo2: 98,
    respiratory_rate: 16,
    temperature_c: 37.0,
    gcs: 15,
    clinician_observations: '',
    notes: '',
  });

  // Form states for clinician override
  const [overrideForm, setOverrideForm] = useState({
    override_level: 3,
    override_reason: '',
    notes: '',
    clinician_name: 'Attending Clinician',
  });

  // Form for new treatment
  const [treatmentForm, setTreatmentForm] = useState({
    name: '',
    type: 'medication',
    dose: '',
    route: 'IV',
    frequency: 'Continuous',
    infusion_rate: '',
    starting_quantity: '',
  });

  const loadPatientAndPipeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Patient
      let p = null;
      if (patientId) {
        p = await patientsApi.getPatient(patientId);
      } else {
        const listRes = await patientsApi.listPatients({ limit: 1 });
        if (listRes.patients?.length > 0) {
          p = listRes.patients[0];
        }
      }

      if (!p) {
        setError('No patient found for assessment.');
        setIsLoading(false);
        return;
      }

      setActivePatient(p);
      setVitalsForm({
        heart_rate: p.heart_rate || 80,
        sbp: p.sbp || 120,
        dbp: p.dbp || 80,
        spo2: p.spo2 || 98,
        respiratory_rate: p.respiratory_rate || 16,
        temperature_c: p.temperature_c || 37.0,
        gcs: p.gcs || 15,
        clinician_observations: '',
        notes: '',
      });
      setOverrideForm(prev => ({
        ...prev,
        override_level: p.predicted_triage_level || p.triage_level || 3,
      }));

      const pId = p.patient_id;

      // 2. Run ML Triage Score & Fetch Monitoring
      const [scoreRes, monRes, histRes, treatRes] = await Promise.all([
        triageApi.scorePatient(pId).catch(() => null),
        reassessmentApi.getStatus(pId).catch(() => null),
        reassessmentApi.getHistory(pId).catch(() => ({ timeline: [] })),
        treatmentsApi.getPatientTreatments(pId).catch(() => ({ treatments: [] })),
      ]);

      if (scoreRes) setAssessment(scoreRes);
      if (monRes) setMonitoringStatus(monRes);
      if (histRes) setReassessmentHistory(histRes.timeline || []);
      if (treatRes) setTreatments(treatRes.treatments || []);

      const triageLvl = scoreRes?.predicted_triage_level || p.predicted_triage_level || 3;
      const isHighRisk = scoreRes?.is_high_risk || false;
      const complaint = p.chief_complaint || 'Acute presentation';
      const symptoms = p.symptoms || '';
      const history = p.medical_history || '';

      // 3. Concurrent Bed & Doctor & Test rules
      const [bedRes, docRes, testRes] = await Promise.all([
        bedsApi.recommendBed(pId, triageLvl, isHighRisk, complaint, symptoms, history).catch(() => null),
        doctorsApi.assignDoctor(pId, triageLvl, complaint, p.age).catch(() => null),
        testsApi.recommendTests(pId, complaint, symptoms, history).catch(() => null),
      ]);

      if (bedRes) setBedRecommendation(bedRes);
      if (docRes) setDoctorAssignment(docRes);
      if (testRes) setSuggestedTests(testRes.suggested_tests || []);
    } catch (err) {
      console.error('Assessment pipeline error:', err);
      setError(err.message || 'Error running clinical assessment.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientAndPipeline();
  }, [loadPatientAndPipeline]);

  // Submit New Vital Signs (triggers deterioration evaluation)
  const handleRecordVitals = async (e) => {
    e.preventDefault();
    if (!activePatient) return;
    setIsSubmitting(true);
    try {
      await reassessmentApi.recordVitals(activePatient.patient_id, {
        heart_rate: Number(vitalsForm.heart_rate),
        sbp: Number(vitalsForm.sbp),
        dbp: Number(vitalsForm.dbp),
        spo2: Number(vitalsForm.spo2),
        respiratory_rate: Number(vitalsForm.respiratory_rate),
        temperature_c: Number(vitalsForm.temperature_c),
        gcs: Number(vitalsForm.gcs),
        clinician_observations: vitalsForm.clinician_observations,
        notes: vitalsForm.notes,
        actor: 'Attending Clinician',
      });
      setShowRecordVitalsModal(false);
      await loadPatientAndPipeline();
    } catch (err) {
      alert('Error recording vitals: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Clinician Override
  const handleClinicianOverride = async (e) => {
    e.preventDefault();
    if (!activePatient || !overrideForm.override_reason.trim()) return;
    setIsSubmitting(true);
    try {
      await reassessmentApi.overrideAssessment(activePatient.patient_id, {
        override_level: Number(overrideForm.override_level),
        clinician_name: overrideForm.clinician_name || 'Attending Clinician',
        override_reason: overrideForm.override_reason,
        notes: overrideForm.notes,
      });
      setShowOverrideModal(false);
      await loadPatientAndPipeline();
    } catch (err) {
      alert('Error applying override: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Bed Action
  const handleAssignBed = async () => {
    if (!activePatient || !bedRecommendation?.recommended_bed) return;
    setIsSubmitting(true);
    try {
      await bedsApi.assignBed(
        activePatient.patient_id,
        bedRecommendation.recommended_bed.unit_id,
        bedRecommendation.recommended_bed.bed_id
      );
      alert(`Bed ${bedRecommendation.recommended_bed.bed_label || bedRecommendation.recommended_bed.bed_id} successfully assigned.`);
      navigate('/beds');
    } catch (err) {
      alert('Error assigning bed: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !activePatient) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-slate-500 bg-white border border-clinical-border rounded-xl shadow-2xs">
        Loading patient clinical assessment & model inference...
      </div>
    );
  }

  const effectiveLevel = monitoringStatus?.has_clinician_override
    ? monitoringStatus.override_level
    : assessment?.predicted_triage_level || activePatient?.predicted_triage_level || 3;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Clinical Decision Support</span>
            <span>•</span>
            <span>Intelligent Assessment & Monitoring</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Triage Assessment & Diagnostic Engine
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRecordVitalsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Activity className="h-4 w-4 text-blue-600" />
            Record New Vitals
          </button>
          <button
            type="button"
            onClick={() => setShowOverrideModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Edit3 className="h-4 w-4 text-purple-600" />
            Clinician Override
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            ← Back to Queue
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* Patient Demographic Banner Card */}
      {activePatient && (
        <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-clinical-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{activePatient.full_name}</h2>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {activePatient.patient_id}
                </span>
                {assessment?.age_group && (
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    Cohort: {assessment.age_group}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {activePatient.age} yrs · {activePatient.gender} · Arrival: {activePatient.arrival_mode || 'Walk-in'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SeverityBadge level={effectiveLevel} size="lg" />
              {monitoringStatus?.has_clinician_override && (
                <span className="px-2 py-1 rounded text-[10px] font-extrabold uppercase bg-purple-50 text-purple-800 border border-purple-200">
                  Clinician Override Active
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Chief Complaint
              </span>
              <p className="font-medium text-slate-900 italic">"{activePatient.chief_complaint}"</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Symptoms & Observations
              </span>
              <p className="text-slate-700">{activePatient.symptoms || 'None recorded'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Medical History & Allergies
              </span>
              <p className="text-slate-700">{activePatient.medical_history || 'None'} (Allergies: {activePatient.known_allergies || 'None'})</p>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Decision Grid: Acuity & Risk / Data Quality / Monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Acuity & ML Risk */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Clinical Risk Estimate & Confidence
          </span>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {Math.round(assessment?.risk_score || activePatient?.risk_score || 50)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                {(assessment?.risk_score || activePatient?.risk_score || 50) > 70 ? 'High Acuity Risk' : 'Moderate Clinical Risk'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-blue-700 font-mono">
                {Math.round((assessment?.confidence || 0.85) * 100)}%
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Model Confidence</div>
            </div>
          </div>
        </div>

        {/* Card 2: Data Quality & Uncertainty */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Data Quality & Uncertainty
            </span>
            {assessment?.is_unseen_input && (
              <span className="text-[9px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                Unseen Input
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {assessment?.data_quality === 'Complete' && !assessment?.is_unseen_input ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            )}
            <span className="font-bold text-sm text-slate-900">
              {assessment?.data_quality || 'Complete'} Quality
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {assessment?.uncertainty_reason ||
             assessment?.review_reason ||
             (assessment?.needs_clinician_review
               ? 'Clinical review recommended to verify baseline presentation.'
               : 'All input physiological vitals and clinical features verified.')}
          </p>
          {assessment?.input_classification && (
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.entries(assessment.input_classification).map(([key, val]) => (
                <span
                  key={key}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                    val === 'KNOWN'
                      ? 'bg-slate-50 text-slate-700 border-slate-200'
                      : val === 'UNKNOWN/UNSEEN'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {key.replace('_', ' ')}: {val}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Monitoring & Reassessment Timer */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Monitoring & Reassessment
          </span>
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-sm text-slate-900 font-mono">
              Due in {monitoringStatus?.minutes_until_next_due ?? 15}m
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Interval: {monitoringStatus?.reassessment_interval_minutes ?? 15}m
            </span>
          </div>
          <div className="text-[11px] text-slate-600">
            Surge compression: <span className="font-bold uppercase text-slate-800">{monitoringStatus?.surge_tier || 'Normal'}</span>
          </div>
        </div>
      </div>

      {/* Physiological Vitals Visualizer */}
      {activePatient && (
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Current Physiological Vital Signs
          </span>
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
        </div>
      )}

      {/* Bed & Doctor Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bed Recommendation */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-clinical-border pb-2">
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Recommended Unit & Bed Allocation
              </h3>
            </div>
            {bedRecommendation?.recommended_bed && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {bedRecommendation.recommended_bed.match_score}% Match
              </span>
            )}
          </div>

          {bedRecommendation?.recommended_bed ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {bedRecommendation.recommended_bed.bed_label || bedRecommendation.recommended_bed.bed_id}
                </span>
                <span className="text-slate-600">
                  {bedRecommendation.recommended_bed.unit_name} (Floor {bedRecommendation.recommended_bed.floor || 1})
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {bedRecommendation.recommendation_reason}
              </p>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAssignBed}
                className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
              >
                Assign Bed Now
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic py-2">
              No immediate bed recommended or all matched units at capacity.
            </div>
          )}
        </div>

        {/* Doctor Assignment */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-clinical-border pb-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Attending Physician Routing
              </h3>
            </div>
            {doctorAssignment?.match_score && (
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {doctorAssignment.match_score}% Match
              </span>
            )}
          </div>

          {doctorAssignment?.doctor ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {doctorAssignment.doctor.name}
                </span>
                <span className="text-slate-600 font-semibold">
                  {doctorAssignment.doctor.specialty}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Caseload: {doctorAssignment.doctor.current_caseload} / {doctorAssignment.doctor.max_caseload} active patients
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {doctorAssignment.assignment_rationale}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic py-2">
              Physician assignment pending triage queue review.
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic Tests Panel */}
      {suggestedTests.length > 0 && (
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-clinical-border pb-2">
            <FlaskConical className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Recommended Diagnostic Protocols & Lab Panels
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {suggestedTests.map((test, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="font-bold text-slate-900">{test.test_name || test.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">{test.category || 'Diagnostic'} · Priority: {test.priority || 'Routine'}</div>
                <div className="text-[11px] text-slate-600">{test.rationale || test.clinical_indication}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explainability Factors */}
      {((assessment?.top_factors && assessment.top_factors.length > 0) || (assessment?.explainability_factors && assessment.explainability_factors.length > 0)) && (
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-clinical-border pb-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Explainability & Key Decision Factors
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {(assessment?.top_factors || assessment.explainability_factors).map((factor, i) => {
              if (typeof factor === 'string') {
                return (
                  <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-bold text-slate-900 block">{factor}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{factor.factor}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                      factor.severity_impact === 'critical'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : factor.severity_impact === 'high'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {factor.severity_impact}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">{factor.detail}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Weight: +{factor.contribution}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reassessment History Timeline */}
      <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-clinical-border pb-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Reassessment Timeline ({reassessmentHistory.length} Recorded)
            </h3>
          </div>
        </div>

        {reassessmentHistory.length > 0 ? (
          <div className="space-y-2.5">
            {reassessmentHistory.map((item, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Level {item.current_triage_level}
                    </span>
                    {item.previous_triage_level !== item.current_triage_level && (
                      <span className="text-[10px] text-slate-500">
                        (was Level {item.previous_triage_level})
                      </span>
                    )}
                    {item.deterioration_detected && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Deterioration Detected
                      </span>
                    )}
                    {item.clinician_override && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Clinician Override
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {item.reason_for_reassessment || item.override_reason || 'Periodic vital signs reassessment'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic py-2">
            No previous reassessments recorded. Baseline intake active.
          </div>
        )}
      </div>

      {/* Record New Vitals Modal */}
      {showRecordVitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="font-bold text-sm text-slate-900">Record New Patient Vital Signs</h3>
              <button
                type="button"
                onClick={() => setShowRecordVitalsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordVitals} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Heart Rate (HR)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.heart_rate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Systolic BP</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.sbp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, sbp: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Diastolic BP</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.dbp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, dbp: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">SpO2 (%)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Resp. Rate (/min)</label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.respiratory_rate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, respiratory_rate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
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
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Clinical Observations / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Acute desaturation, increased work of breathing"
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
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
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Evaluating...' : 'Save & Evaluate Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinician Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="font-bold text-sm text-slate-900">Apply Clinician Acuity Override</h3>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClinicianOverride} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Override Acuity Level</label>
                <select
                  value={overrideForm.override_level}
                  onChange={(e) => setOverrideForm({ ...overrideForm, override_level: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value={1}>Level 1 — Resuscitation</option>
                  <option value={2}>Level 2 — Emergent</option>
                  <option value={3}>Level 3 — Urgent</option>
                  <option value={4}>Level 4 — Less Urgent</option>
                  <option value={5}>Level 5 — Non-Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Clinical Justification / Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Clinical presentation concerning for acute silent ischemia despite nominal baseline vitals."
                  value={overrideForm.override_reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, override_reason: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Clinician Name & Signature</label>
                <input
                  type="text"
                  required
                  value={overrideForm.clinician_name}
                  onChange={(e) => setOverrideForm({ ...overrideForm, clinician_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
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
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Override & Log Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentPage;
