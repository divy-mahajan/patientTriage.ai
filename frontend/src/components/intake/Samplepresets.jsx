import React from 'react';
import { Sparkles, Zap, HeartPulse, ShieldAlert, Activity, Bandage } from 'lucide-react';

export const SAMPLE_PRESETS = [
  {
    id: 'chest_pain_l2',
    name: 'Acute Coronary Syndrome / STEMI (ESI 2)',
    badge: 'Level 2 Emergent',
    icon: HeartPulse,
    color: 'border-orange-200 bg-orange-50/60 hover:bg-orange-100/70 text-orange-950',
    data: {
      full_name: 'Johnson, Robert',
      dob: '1964-04-12',
      age: 62,
      gender: 'M',
      arrival_mode: 'Ambulance (EMS)',
      chief_complaint: 'Crushing substernal chest pain radiating to left arm and jaw with diaphoresis for 45 minutes',
      symptoms: 'Chest Pain (Substernal); Shortness of Breath (Dyspnea); Diaphoresis / Cold Sweats',
      clinician_observations: 'Pale / Diaphoretic; Restless / Severe Distress',
      known_allergies: 'Aspirin; Penicillin',
      medical_history: 'Hypertension; Hyperlipidemia; Coronary Artery Disease',
      heart_rate: 118,
      sbp: 88,
      dbp: 56,
      spo2: 91,
      respiratory_rate: 26,
      temperature_c: 36.6,
      gcs: 15
    }
  },
  {
    id: 'sepsis_l2',
    name: 'Severe Urosepsis with Hypotension (ESI 2)',
    badge: 'Level 2 Emergent',
    icon: ShieldAlert,
    color: 'border-orange-200 bg-orange-50/60 hover:bg-orange-100/70 text-orange-950',
    data: {
      full_name: 'Miller, Eleanor',
      dob: '1968-11-03',
      age: 58,
      gender: 'F',
      arrival_mode: 'Walk-in',
      chief_complaint: 'High rigors, severe flank pain, dysuria, and acute confusion for 24 hours',
      symptoms: 'High Fever & Rigors; Flank Pain & Hematuria; Altered Mental Status; Nausea & Vomiting',
      clinician_observations: 'Lethargic / Poorly Responsive; Confused / Disoriented',
      known_allergies: 'Sulfa drugs',
      medical_history: 'Type 2 Diabetes Mellitus; Chronic Kidney Disease',
      heart_rate: 128,
      sbp: 82,
      dbp: 50,
      spo2: 90,
      respiratory_rate: 30,
      temperature_c: 39.4,
      gcs: 14
    }
  },
  {
    id: 'appendicitis_l3',
    name: 'Acute RLQ Appendicitis (ESI 3)',
    badge: 'Level 3 Urgent',
    icon: Activity,
    color: 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-950',
    data: {
      full_name: 'Gupta, Siddharth',
      dob: '1998-07-21',
      age: 28,
      gender: 'M',
      arrival_mode: 'Walk-in',
      chief_complaint: 'Progressive periumbilical pain migrating to right lower quadrant with anorexia and low-grade fever',
      symptoms: 'Severe Abdominal Pain; Nausea & Vomiting; High Fever & Rigors',
      clinician_observations: 'Abdominal Guarding / Rebound; Restless / Severe Distress',
      known_allergies: 'None known',
      medical_history: 'None',
      heart_rate: 104,
      sbp: 128,
      dbp: 82,
      spo2: 98,
      respiratory_rate: 20,
      temperature_c: 38.5,
      gcs: 15
    }
  },
  {
    id: 'laceration_l4',
    name: 'Forearm Glass Laceration (ESI 4)',
    badge: 'Level 4 Less Urgent',
    icon: Bandage,
    color: 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950',
    data: {
      full_name: 'Davis, Clara',
      dob: '1994-09-15',
      age: 32,
      gender: 'F',
      arrival_mode: 'Walk-in',
      chief_complaint: 'Deep 4cm linear laceration to volar left forearm from broken window glass. Hemostasis achieved with direct pressure.',
      symptoms: 'Deep Laceration / Hemorrhage',
      clinician_observations: 'Non-Toxic / Well-Appearing',
      known_allergies: 'Latex',
      medical_history: 'None',
      heart_rate: 74,
      sbp: 118,
      dbp: 76,
      spo2: 99,
      respiratory_rate: 16,
      temperature_c: 36.8,
      gcs: 15
    }
  },
  {
    id: 'suture_l5',
    name: 'Post-op Suture Removal (ESI 5)',
    badge: 'Level 5 Non-Urgent',
    icon: Activity,
    color: 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900',
    data: {
      full_name: 'Taylor, Marcus',
      dob: '1981-02-10',
      age: 45,
      gender: 'M',
      arrival_mode: 'Walk-in',
      chief_complaint: 'Routine suture removal from healed forehead laceration (Day 10 post-injury). Clean wound margins without erythema.',
      symptoms: 'Suture Removal / Minor Rash',
      clinician_observations: 'Non-Toxic / Well-Appearing',
      known_allergies: 'None known',
      medical_history: 'None',
      heart_rate: 68,
      sbp: 122,
      dbp: 80,
      spo2: 99,
      respiratory_rate: 14,
      temperature_c: 36.7,
      gcs: 15
    }
  }
];

export const SamplePresets = ({ onSelectPreset }) => {
  return (
    <div className="mb-6 rounded-xl border border-blue-200/80 bg-blue-50/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-clinical-primary-container" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-clinical-primary-container">
          Load 1-Click Clinical Scenario Presets (Live Demonstration)
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {SAMPLE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.data)}
              className={`text-left rounded-lg border p-3 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-start gap-2.5 ${preset.color}`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/80 shadow-2xs">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold leading-tight truncate">
                  {preset.name}
                </span>
                <span className="text-[10px] opacity-80 block mt-0.5 font-medium">
                  {preset.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SamplePresets;
