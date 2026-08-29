import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Activity,
  Heart,
  FileText,
  Stethoscope,
  AlertTriangle,
  User,
  CheckCircle2
} from 'lucide-react';
import StepperHeader from '../components/intake/StepperHeader';
import SymptomChipSelector from '../components/intake/SymptomChipSelector';
import SamplePresets from '../components/intake/SamplePresets';
import VitalsPills from '../components/common/VitalsPills';
import { patientsApi } from '../api/patientsApi';
import { useHospital } from '../context/HospitalContext';

const ARRIVAL_MODES = [
  'Walk-in',
  'Ambulance (EMS)',
  'Private Vehicle',
  'Helicopter (Air Ambulance)',
  'Police / Corrections',
  'Public Transit'
];

const MEDICAL_HISTORY_TAGS = [
  'Hypertension',
  'Type 2 Diabetes Mellitus',
  'Coronary Artery Disease',
  'History of Myocardial Infarction',
  'COPD / Emphysema',
  'Asthma',
  'Atrial Fibrillation',
  'Heart Failure (CHF)',
  'Chronic Kidney Disease',
  'History of Stroke / TIA',
  'Immunocompromised',
  'Anticoagulant Therapy (Warfarin/DOAC)'
];

const INITIAL_FORM = {
  patient_id: '',
  full_name: '',
  dob: '',
  age: '',
  gender: 'M',
  arrival_mode: 'Walk-in',
  chief_complaint: '',
  symptoms: '',
  clinician_observations: '',
  known_allergies: 'None known',
  medical_history: 'None',
  heart_rate: '',
  sbp: '',
  dbp: '',
  spo2: '',
  respiratory_rate: '',
  temperature_c: '37.0',
  gcs: '15'
};

export const IntakePage = () => {
  const navigate = useNavigate();
  const { fetchPatients, addNotification } = useHospital();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
    patient_id: `P-${Math.floor(10000 + Math.random() * 90000)}`
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedObservations, setSelectedObservations] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isMissing = (val) =>
    val === '' || val === null || val === undefined || (typeof val === 'string' && val.trim() === '');

  // Handle Preset Load
  const handleLoadPreset = (presetData) => {
    const syms = presetData.symptoms ? presetData.symptoms.split(';').map(s => s.trim()).filter(Boolean) : [];
    const obs = presetData.clinician_observations ? presetData.clinician_observations.split(';').map(o => o.trim()).filter(Boolean) : [];
    const hist = presetData.medical_history ? presetData.medical_history.split(';').map(h => h.trim()).filter(Boolean) : [];

    setSelectedSymptoms(syms);
    setSelectedObservations(obs);
    setSelectedHistory(hist);

    setFormData({
      ...INITIAL_FORM,
      ...presetData,
      patient_id: `P-${Math.floor(10000 + Math.random() * 90000)}`,
      heart_rate: String(presetData.heart_rate ?? ''),
      sbp: String(presetData.sbp ?? ''),
      dbp: String(presetData.dbp ?? ''),
      spo2: String(presetData.spo2 ?? ''),
      respiratory_rate: String(presetData.respiratory_rate ?? ''),
      temperature_c: String(presetData.temperature_c ?? '37.0'),
      gcs: String(presetData.gcs ?? '15')
    });

    setErrorMessage('');
    setCurrentStep(3); // Jump to vitals for review
    if (addNotification) {
      addNotification('Sample Scenario Loaded', `Loaded preset for ${presetData.full_name}`, 'info');
    }
  };

  const handleToggleSymptom = (sym) => {
    setSelectedSymptoms((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      setFormData((f) => ({ ...f, symptoms: next.join('; ') }));
      return next;
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleToggleObservation = (obs) => {
    setSelectedObservations((prev) => {
      const next = prev.includes(obs) ? prev.filter((o) => o !== obs) : [...prev, obs];
      setFormData((f) => ({ ...f, clinician_observations: next.join('; ') }));
      return next;
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleToggleHistory = (hist) => {
    setSelectedHistory((prev) => {
      const next = prev.includes(hist) ? prev.filter((h) => h !== hist) : [...prev, hist];
      setFormData((f) => ({ ...f, medical_history: next.length ? next.join('; ') : 'None' }));
      return next;
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  // Step Validity Helper for Reactive Next Button
  const isStepValid = (stepNum) => {
    if (stepNum === 1) {
      return (
        !isMissing(formData.full_name) &&
        !isMissing(formData.age) &&
        Number(formData.age) >= 0 &&
        !isNaN(Number(formData.age)) &&
        !isMissing(formData.gender) &&
        !isMissing(formData.arrival_mode)
      );
    }
    if (stepNum === 2) {
      return !isMissing(formData.chief_complaint);
    }
    if (stepNum === 3) {
      return (
        !isMissing(formData.heart_rate) &&
        !isMissing(formData.sbp) &&
        !isMissing(formData.dbp) &&
        !isMissing(formData.spo2) &&
        !isMissing(formData.respiratory_rate) &&
        !isMissing(formData.gcs)
      );
    }
    // Steps 4, 5, 6 are optional or review steps
    return true;
  };

  const validateStep = (stepNum) => {
    setErrorMessage('');
    if (stepNum === 1) {
      if (isMissing(formData.full_name)) {
        setErrorMessage('Please enter the patient full name.');
        return false;
      }
      if (isMissing(formData.age) || Number(formData.age) < 0 || isNaN(Number(formData.age))) {
        setErrorMessage('Please enter a valid patient age.');
        return false;
      }
      if (isMissing(formData.gender)) {
        setErrorMessage('Please select a gender.');
        return false;
      }
      if (isMissing(formData.arrival_mode)) {
        setErrorMessage('Please select an arrival mode.');
        return false;
      }
    } else if (stepNum === 2) {
      if (isMissing(formData.chief_complaint)) {
        setErrorMessage('Please enter the primary chief complaint.');
        return false;
      }
    } else if (stepNum === 3) {
      if (
        isMissing(formData.heart_rate) ||
        isMissing(formData.sbp) ||
        isMissing(formData.dbp) ||
        isMissing(formData.spo2) ||
        isMissing(formData.respiratory_rate) ||
        isMissing(formData.gcs)
      ) {
        setErrorMessage('Please enter all physiological vital signs (HR, SBP, DBP, SpO2, RR, GCS).');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    setErrorMessage('');
    setCurrentStep((prev) => Math.min(6, prev + 1));
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleReset = () => {
    setFormData({
      ...INITIAL_FORM,
      patient_id: `P-${Math.floor(10000 + Math.random() * 90000)}`
    });
    setSelectedSymptoms([]);
    setSelectedObservations([]);
    setSelectedHistory([]);
    setCurrentStep(1);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        patient_id: formData.patient_id || `P-${Math.floor(10000 + Math.random() * 90000)}`,
        full_name: formData.full_name.trim(),
        dob: formData.dob || null,
        age: Number(formData.age),
        gender: formData.gender,
        arrival_mode: formData.arrival_mode,
        chief_complaint: formData.chief_complaint.trim(),
        symptoms: selectedSymptoms.length ? selectedSymptoms.join('; ') : formData.symptoms ? formData.symptoms.trim() : '',
        clinician_observations: selectedObservations.length ? selectedObservations.join('; ') : formData.clinician_observations ? formData.clinician_observations.trim() : '',
        known_allergies: formData.known_allergies ? formData.known_allergies.trim() : 'None known',
        medical_history: selectedHistory.length ? selectedHistory.join('; ') : formData.medical_history ? formData.medical_history.trim() : 'None',
        heart_rate: Number(formData.heart_rate),
        sbp: Number(formData.sbp),
        dbp: Number(formData.dbp),
        spo2: Number(formData.spo2),
        respiratory_rate: Number(formData.respiratory_rate),
        temperature_c: !isMissing(formData.temperature_c) ? Number(formData.temperature_c) : 37.0,
        gcs: Number(formData.gcs),
      };

      const savedPatient = await patientsApi.createPatient(payload);
      if (addNotification) {
        addNotification(
          'Patient Registered',
          `Intake complete for ${savedPatient.full_name} (${savedPatient.patient_id})`,
          'success'
        );
      }
      if (fetchPatients) {
        await fetchPatients();
      }
      navigate(`/assessment/${encodeURIComponent(savedPatient.patient_id)}`);
    } catch (err) {
      console.error('Error saving patient intake:', err);
      setErrorMessage(err.message || 'Failed to save patient record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ageNum = Number(formData.age);
  const ageCohort = !isMissing(formData.age) && !isNaN(ageNum)
    ? (ageNum < 18 ? 'Pediatric (<18y)' : ageNum >= 65 ? 'Geriatric (65+y)' : 'Adult (18–64y)')
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Intake Protocol</span>
            <span>•</span>
            <span>Step {currentStep} of 6</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Rapid Patient Intake & Triage
          </h1>
          <p className="text-xs sm:text-sm text-clinical-text-secondary mt-0.5">
            Structured clinical registration, chief complaint capture, and physiological vitals logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Form
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>

      {/* 1-Click Clinical Scenario Presets */}
      <SamplePresets onSelectPreset={handleLoadPreset} />

      {/* Stepper Header */}
      <StepperHeader
        currentStep={currentStep}
        onStepClick={(stepId) => {
          if (stepId < currentStep || validateStep(currentStep)) {
            setCurrentStep(stepId);
          }
        }}
      />

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-800 font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-xl border border-clinical-border bg-white p-6 shadow-2xs">
        {/* Step 1: Demographics & Arrival */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
              Patient Registration & Demographics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Patient ID (Auto-Generated)
                </label>
                <input
                  type="text"
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold bg-slate-50 text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Age (Years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  min="0"
                  max="125"
                  placeholder="e.g. 45"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                />
                {ageCohort && (
                  <span className="text-[10px] font-semibold text-blue-700 mt-1 block">
                    Cohort: {ageCohort}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Biological Sex <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white text-slate-900 focus:outline-hidden"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="Other">Other / Non-Binary</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Arrival Mode <span className="text-red-500">*</span>
                </label>
                <select
                  name="arrival_mode"
                  value={formData.arrival_mode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white text-slate-900 focus:outline-hidden"
                >
                  {ARRIVAL_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Chief Complaint */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
              Chief Complaint & Clinical Presentation
            </h3>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Primary Chief Complaint (Patient's Own Words / EMS Summary) <span className="text-red-500">*</span>
              </label>
              <textarea
                name="chief_complaint"
                rows={3}
                required
                placeholder="e.g. Severe crushing substernal chest pain radiating to left jaw, accompanied by diaphoresis and acute shortness of breath."
                value={formData.chief_complaint}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Quick Complaint Buttons */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Common Emergency Complaint Templates (Click to apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Acute crushing substernal chest pain with left arm radiation',
                  'Sudden onset severe shortness of breath, wheezing and tachypnea',
                  'Acute right lower quadrant abdominal pain with fever and guarding',
                  'Sudden facial droop, right arm weakness, and slurred speech (LVO Protocol)',
                  'Blunt polytrauma following high-speed motor vehicle collision',
                  'Severe throbbing unilateral headache with photophobia and nausea',
                  'Laceration to forearm with continuous active bleeding',
                  'High fever, productive cough with purulent sputum, and pleuritic pain'
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, chief_complaint: promptText }));
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1 text-left transition cursor-pointer"
                  >
                    + {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Vital Signs */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-clinical-border pb-2">
              <h3 className="text-sm font-bold text-clinical-text-primary flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
                Physiological Vital Signs & Mental Status
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">
                All 6 vital signs required for triage scoring
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Heart Rate */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Heart Rate (HR) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="heart_rate"
                    min="20"
                    max="300"
                    required
                    placeholder="80"
                    value={formData.heart_rate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">bpm</span>
                </div>
                {formData.heart_rate !== '' && (
                  <span className={`text-[10px] font-bold block mt-1 ${Number(formData.heart_rate) > 100 || Number(formData.heart_rate) < 50 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {Number(formData.heart_rate) > 100 ? 'Tachycardia' : Number(formData.heart_rate) < 50 ? 'Bradycardia' : 'Normal'}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">Norm: 60–100</span>
              </div>

              {/* SBP */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Systolic BP (SBP) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="sbp"
                    min="40"
                    max="300"
                    required
                    placeholder="120"
                    value={formData.sbp}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">mmHg</span>
                </div>
                {formData.sbp !== '' && (
                  <span className={`text-[10px] font-bold block mt-1 ${Number(formData.sbp) < 90 || Number(formData.sbp) > 180 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {Number(formData.sbp) < 90 ? 'Hypotension' : Number(formData.sbp) > 180 ? 'Hypertensive Crisis' : 'Normal'}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">Norm: 100–135</span>
              </div>

              {/* DBP */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Diastolic BP (DBP) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="dbp"
                    min="20"
                    max="200"
                    required
                    placeholder="80"
                    value={formData.dbp}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">mmHg</span>
                </div>
                {formData.dbp !== '' && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">Recorded</span>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">Norm: 60–85</span>
              </div>

              {/* SpO2 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Oxygen Saturation (SpO2) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="spo2"
                    min="40"
                    max="100"
                    required
                    placeholder="98"
                    value={formData.spo2}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">%</span>
                </div>
                {formData.spo2 !== '' && (
                  <span className={`text-[10px] font-bold block mt-1 ${Number(formData.spo2) < 92 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {Number(formData.spo2) < 92 ? 'Hypoxemia' : 'Normal'}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">Norm: 95–100%</span>
              </div>

              {/* Respiratory Rate */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Respiratory Rate (RR) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="respiratory_rate"
                    min="4"
                    max="80"
                    required
                    placeholder="16"
                    value={formData.respiratory_rate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">/min</span>
                </div>
                {formData.respiratory_rate !== '' && (
                  <span className={`text-[10px] font-bold block mt-1 ${Number(formData.respiratory_rate) > 22 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {Number(formData.respiratory_rate) > 22 ? 'Tachypnea' : 'Normal'}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 mt-0.5 block">Norm: 12–20</span>
              </div>

              {/* Temperature */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Body Temperature
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    name="temperature_c"
                    min="25"
                    max="45"
                    placeholder="37.0"
                    value={formData.temperature_c}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">°C</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 36.5–37.5°C</span>
              </div>
            </div>

            {/* GCS Coma Scale */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Glasgow Coma Scale (GCS) Score <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {formData.gcs !== '' ? `${formData.gcs} / 15` : 'Not set'}
                </span>
              </div>
              <input
                type="range"
                name="gcs"
                min="3"
                max="15"
                step="1"
                value={formData.gcs !== '' ? formData.gcs : 15}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, gcs: e.target.value }));
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>3: Severe / Coma</span>
                <span>8: Intubation Ref</span>
                <span>15: Alert & Oriented</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Symptoms & Observations */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">4</span>
              Structured Symptoms & Physical Observations
            </h3>

            <SymptomChipSelector
              selectedSymptoms={selectedSymptoms}
              onToggleSymptom={handleToggleSymptom}
              selectedObservations={selectedObservations}
              onToggleObservation={handleToggleObservation}
            />

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Additional Clinical Observations / Notes
              </label>
              <input
                type="text"
                name="clinician_observations"
                placeholder="e.g. Peripheral cyanosis noted, patient anxious"
                value={formData.clinician_observations}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Step 5: History & Allergies */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">5</span>
              Medical History & Known Allergies
            </h3>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Known Drug / Food Allergies
              </label>
              <input
                type="text"
                name="known_allergies"
                placeholder="e.g. Penicillin (Anaphylaxis), Sulfa drugs, NKDA"
                value={formData.known_allergies}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Pre-Existing Chronic Conditions & Comorbidities (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_HISTORY_TAGS.map((tag) => {
                  const isSelected = selectedHistory.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleHistory(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Assess */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">6</span>
              Review Intake Summary & Run ML Triage
            </h3>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {formData.full_name || 'Unnamed Patient'}
                  </h4>
                  <span className="text-xs text-slate-600 font-mono">
                    ID: {formData.patient_id} · {formData.age ? `${formData.age}y` : '-'} · {formData.gender || '-'} · {formData.arrival_mode || 'Walk-in'}
                  </span>
                </div>
                <span className="rounded bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 border border-blue-200">
                  Ready for ML Scoring
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Chief Complaint:
                </span>
                <p className="text-xs text-slate-900 font-medium italic mt-0.5">
                  "{formData.chief_complaint || 'None entered'}"
                </p>
              </div>

              {selectedSymptoms.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Recorded Symptoms:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSymptoms.map((s, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-medium text-slate-800">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedHistory.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Medical History:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHistory.map((h, idx) => (
                      <span key={idx} className="bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Physiological Vital Signs:
                </span>
                <VitalsPills
                  heartRate={formData.heart_rate !== '' ? Number(formData.heart_rate) : null}
                  sbp={formData.sbp !== '' ? Number(formData.sbp) : null}
                  dbp={formData.dbp !== '' ? Number(formData.dbp) : null}
                  spo2={formData.spo2 !== '' ? Number(formData.spo2) : null}
                  respiratoryRate={formData.respiratory_rate !== '' ? Number(formData.respiratory_rate) : null}
                  temperatureC={formData.temperature_c !== '' ? Number(formData.temperature_c) : 37.0}
                  gcs={formData.gcs !== '' ? Number(formData.gcs) : 15}
                  size="md"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Next Action: </span>
              Clicking below will persist this patient in SQLite, compute the interpretable ESI risk score, evaluate rule-based diagnostic panels, and match available hospital beds.
            </div>
          </div>
        )}

        {/* Wizard Action Footer */}
        <div className="flex items-center justify-between border-t border-clinical-border pt-5 mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isStepValid(currentStep)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold transition shadow-xs ${
                isStepValid(currentStep)
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <span>Next Step</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-6 py-2.5 text-xs font-extrabold hover:bg-emerald-700 transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>Saving & Triaging...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Save & Run Triage</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntakePage;
