import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Heart,
  FileText
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
  dob: '1985-05-15',
  age: 41,
  gender: 'M',
  arrival_mode: 'Walk-in',
  chief_complaint: '',
  symptoms: '',
  clinician_observations: '',
  known_allergies: 'None known',
  medical_history: '',
  heart_rate: 78,
  sbp: 124,
  dbp: 78,
  spo2: 98,
  respiratory_rate: 16,
  temperature_c: 37.0,
  gcs: 15
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
  const [error, setError] = useState('');

  // Handle Preset Load
  const handleLoadPreset = (presetData) => {
    const syms = presetData.symptoms ? presetData.symptoms.split(';').map(s => s.trim()) : [];
    const obs = presetData.clinician_observations ? presetData.clinician_observations.split(';').map(o => o.trim()) : [];
    const hist = presetData.medical_history ? presetData.medical_history.split(';').map(h => h.trim()) : [];

    setSelectedSymptoms(syms);
    setSelectedObservations(obs);
    setSelectedHistory(hist);

    setFormData({
      ...presetData,
      patient_id: `P-${Math.floor(10000 + Math.random() * 90000)}`
    });

    setCurrentStep(3); // Jump to vitals for review
    addNotification('Sample Scenario Loaded', `Loaded ${presetData.full_name} preset data`, 'info');
  };

  const handleToggleSymptom = (sym) => {
    setSelectedSymptoms(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym];
      setFormData(f => ({ ...f, symptoms: next.join('; ') }));
      return next;
    });
  };

  const handleToggleObservation = (obs) => {
    setSelectedObservations(prev => {
      const next = prev.includes(obs) ? prev.filter(o => o !== obs) : [...prev, obs];
      setFormData(f => ({ ...f, clinician_observations: next.join('; ') }));
      return next;
    });
  };

  const handleToggleHistory = (hist) => {
    setSelectedHistory(prev => {
      const next = prev.includes(hist) ? prev.filter(h => h !== hist) : [...prev, hist];
      setFormData(f => ({ ...f, medical_history: next.length ? next.join('; ') : 'None' }));
      return next;
    });
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.full_name.trim()) {
        setError('Please enter the patient’s full name.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.chief_complaint.trim()) {
        setError('Please enter a chief complaint.');
        return;
      }
    }
    setError('');
    setCurrentStep(prev => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        ...formData,
        age: Number(formData.age),
        heart_rate: Number(formData.heart_rate),
        sbp: Number(formData.sbp),
        dbp: Number(formData.dbp),
        spo2: Number(formData.spo2),
        respiratory_rate: Number(formData.respiratory_rate),
        temperature_c: Number(formData.temperature_c),
        gcs: Number(formData.gcs),
        symptoms: selectedSymptoms.join('; '),
        clinician_observations: selectedObservations.join('; '),
        medical_history: selectedHistory.length ? selectedHistory.join('; ') : 'None'
      };

      const saved = await patientsApi.createPatient(payload);
      addNotification('Patient Intake Completed', `Saved ${saved.full_name} (${saved.patient_id}) into SQLite database`, 'success');
      await fetchPatients();
      navigate(`/assessment/${encodeURIComponent(saved.patient_id)}`);
    } catch (err) {
      console.error('Intake submission error:', err);
      setError(err.message || 'Failed to persist patient record');
    } finally {
      setIsSubmitting(false);
    }
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
    setError('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Rapid Patient Intake & Triage
          </h1>
          <p className="text-xs sm:text-sm text-clinical-text-secondary mt-0.5">
            Structured clinical registration, chief complaint capture, and physiological vitals logging.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Form
        </button>
      </div>

      {/* 1-Click Clinical Scenario Presets */}
      <SamplePresets onSelectPreset={handleLoadPreset} />

      {/* Stepper Header */}
      <StepperHeader currentStep={currentStep} onStepClick={setCurrentStep} />

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-xl border border-clinical-border bg-white p-6 shadow-2xs">
        {/* Step 1: Demographics & Arrival */}
        {currentStep === 1 && (
          <div className="space-y-5">
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
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold bg-slate-50 text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Full Name (Last, First) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Smith, John"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Biological Sex / Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="Other">Other / Non-binary</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Mode of Arrival
                </label>
                <select
                  value={formData.arrival_mode}
                  onChange={(e) => setFormData({ ...formData, arrival_mode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {ARRIVAL_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Known Drug & Environmental Allergies
                </label>
                <input
                  type="text"
                  value={formData.known_allergies}
                  onChange={(e) => setFormData({ ...formData, known_allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa, Latex, Iodine contrast"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Symptoms & Medical History */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
              Chief Complaint, Symptoms & Clinical History
            </h3>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Chief Complaint (Patient's Stated Narrative) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={formData.chief_complaint}
                onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                placeholder="Describe presenting symptoms, onset, quality, radiation, and duration..."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Quick Symptom Chips & Observations */}
            <SymptomChipSelector
              selectedSymptoms={selectedSymptoms}
              onToggleSymptom={handleToggleSymptom}
              selectedObservations={selectedObservations}
              onToggleObservation={handleToggleObservation}
            />

            {/* Medical History Tags */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-2">
                Past Medical History & Comorbidities
              </label>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_HISTORY_TAGS.map((tag) => {
                  const isChecked = selectedHistory.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleHistory(tag)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        isChecked
                          ? 'bg-slate-900 text-white shadow-xs'
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

        {/* Step 3: Vital Signs */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
              Physiological Vital Signs & Mental Status
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Heart Rate */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Heart Rate (HR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="20"
                    max="300"
                    value={formData.heart_rate}
                    onChange={(e) => setFormData({ ...formData, heart_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">bpm</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 60–100</span>
              </div>

              {/* SBP */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Systolic BP (SBP)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="40"
                    max="300"
                    value={formData.sbp}
                    onChange={(e) => setFormData({ ...formData, sbp: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">mmHg</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 100–135</span>
              </div>

              {/* DBP */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Diastolic BP (DBP)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="20"
                    max="200"
                    value={formData.dbp}
                    onChange={(e) => setFormData({ ...formData, dbp: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">mmHg</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 60–85</span>
              </div>

              {/* SpO2 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Oxygen Saturation (SpO2)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="40"
                    max="100"
                    value={formData.spo2}
                    onChange={(e) => setFormData({ ...formData, spo2: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 95–100%</span>
              </div>

              {/* Respiratory Rate */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Respiratory Rate (RR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="4"
                    max="80"
                    value={formData.respiratory_rate}
                    onChange={(e) => setFormData({ ...formData, respiratory_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-mono font-bold bg-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">/min</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Norm: 12–20</span>
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
                    min="25"
                    max="45"
                    value={formData.temperature_c}
                    onChange={(e) => setFormData({ ...formData, temperature_c: parseFloat(e.target.value) || 0 })}
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
                  Glasgow Coma Scale (GCS) Score
                </label>
                <span className="text-xs font-mono font-bold text-slate-900">{formData.gcs} / 15</span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={formData.gcs}
                onChange={(e) => setFormData({ ...formData, gcs: parseInt(e.target.value) || 15 })}
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

        {/* Step 4: Summary & Submit */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-clinical-text-primary border-b border-clinical-border pb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">4</span>
              Review Intake Summary & Run ML Triage
            </h3>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">{formData.full_name}</h4>
                  <span className="text-xs text-slate-600 font-mono">
                    ID: {formData.patient_id} · {formData.age}y · {formData.gender} · {formData.arrival_mode}
                  </span>
                </div>
                <span className="rounded bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 border border-blue-200">
                  Intake Ready
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Chief Complaint:
                </span>
                <p className="text-xs text-slate-900 font-medium italic mt-0.5">
                  "{formData.chief_complaint}"
                </p>
              </div>

              <VitalsPills
                heartRate={formData.heart_rate}
                sbp={formData.sbp}
                dbp={formData.dbp}
                spo2={formData.spo2}
                respiratoryRate={formData.respiratory_rate}
                temperatureC={formData.temperature_c}
                gcs={formData.gcs}
                size="md"
              />
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : <div />}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-1.5 rounded-lg bg-clinical-primary-container text-white px-5 py-2 text-xs font-bold hover:bg-clinical-primary transition shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-6 py-2.5 text-xs font-extrabold hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving & Triaging...' : 'Save & Run AI Assessment'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntakePage;
