import React from 'react';
import { Plus, Check } from 'lucide-react';

export const COMMON_SYMPTOMS = [
  'Chest Pain (Substernal)',
  'Shortness of Breath (Dyspnea)',
  'Diaphoresis / Cold Sweats',
  'Palpitations',
  'Severe Abdominal Pain',
  'Nausea & Vomiting',
  'Dizziness / Syncope',
  'High Fever & Rigors',
  'Altered Mental Status',
  'Facial Droop / Hemiparesis',
  'Dysarthria (Slurred Speech)',
  'Upper GI Bleeding / Hematemesis',
  'Flank Pain & Hematuria',
  'Severe Headache (Thunderclap)',
  'Extremity Fracture / Deformity',
  'Deep Laceration / Hemorrhage',
  'Allergic Reaction / Urticaria',
  'Suture Removal / Minor Rash'
];

export const CLINICIAN_OBSERVATIONS = [
  'Pale / Diaphoretic',
  'Lethargic / Poorly Responsive',
  'Confused / Disoriented',
  'Labored Breathing / Retractions',
  'Abdominal Guarding / Rebound',
  'Restless / Severe Distress',
  'Non-Toxic / Well-Appearing',
  'Cyanotic / Peripheral Pallor',
  'Agitated / Combative'
];

export const SymptomChipSelector = ({
  selectedSymptoms = [],
  onToggleSymptom,
  selectedObservations = [],
  onToggleObservation
}) => {
  return (
    <div className="space-y-5">
      {/* Quick Symptom Chips */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-2">
          Clinical Symptoms (Click to Add / Remove)
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map((symptom) => {
            const isSelected = selectedSymptoms.includes(symptom);
            return (
              <button
                key={symptom}
                type="button"
                onClick={() => onToggleSymptom(symptom)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent hover:border-slate-300'
                }`}
              >
                {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}
                <span>{symptom}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clinician Physical Observations */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-2">
          Triage Nurse Visual Observations
        </label>
        <div className="flex flex-wrap gap-2">
          {CLINICIAN_OBSERVATIONS.map((obs) => {
            const isSelected = selectedObservations.includes(obs);
            return (
              <button
                key={obs}
                type="button"
                onClick={() => onToggleObservation(obs)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50/70 text-amber-900 hover:bg-amber-100/80 border border-amber-200'
                }`}
              >
                {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-amber-500" />}
                <span>{obs}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SymptomChipSelector;
