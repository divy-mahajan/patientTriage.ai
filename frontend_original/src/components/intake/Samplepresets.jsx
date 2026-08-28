import React from 'react';
import { Sparkles, HeartPulse, ShieldAlert, Activity, Bandage, Baby, UserCheck } from 'lucide-react';

export const SAMPLE_PRESETS = [
  {
    id: 'chest_pain_l2',
    name: 'Acute Coronary Syndrome / STEMI (ESI 2)',
    badge: 'Adult · Level 2 Emergent',
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
    id: 'pediatric_croup_l3',
    name: 'Pediatric Acute Stridor & Croup (ESI 3)',
    badge: 'Pediatric (<18y) · Level 3 Urgent',
    icon: Baby,
    color: 'border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-purple-950',
    data: {
      full_name: 'Sharma, Aarav',
      dob: '2020-09-14',
      age: 6,
      gender: 'M',
      arrival_mode: 'Private Vehicle',
      chief_complaint: 'Acute barking seal-like cough with inspiratory stridor and high fever for 24 hours',
      symptoms: 'High Fever & Rigors; Shortness of Breath (Dyspnea)',
      clinician_observations: 'Labored Breathing / Retractions; Restless / Severe Distress',
      known_allergies: 'None known',
      medical_history: 'Asthma',
      heart_rate: 138,
      sbp: 88,
      dbp: 54,
      spo2: 93,
      respiratory_rate: 32,
      temperature_c: 39.1,
      gcs: 15
    }
  },
  {
    id: 'geriatric_delirium_l2',
    name: 'Geriatric Acute Delirium / Sepsis (ESI 2)',
    badge: 'Geriatric (65+y) · Zero History · ESI 2',
    icon: UserCheck,
    color: 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-950',
    data: {
      full_name: 'Mukherjee, Debabrata',
      dob: '1950-03-18',
      age: 76,
      gender: 'M',
      arrival_mode: 'Ambulance (EMS)',
      chief_complaint: 'Acute sudden confusion, lethargy, and low-grade fever noted by family over 12 hours',
      symptoms: 'Altered Mental Status; Dizziness / Syncope',
      clinician_observations: 'Lethargic / Poorly Responsive; Confused / Disoriented',
      known_allergies: 'None known',
      medical_history: 'None',
      heart_rate: 106,
      sbp: 96,
      dbp: 58,
      spo2: 94,
      respiratory_rate: 22,
      temperature_c: 37.9,
      gcs: 13
    }
  },
  {
    id: 'sepsis_l2',
    name: 'Severe Urosepsis with Shock (ESI 2)',
    badge: 'Adult · Level 2 Emergent',
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
    badge: 'Adult · Level 3 Urgent',
    icon: Activity,
    color: 'border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-blue-950',
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
    badge: 'Adult · Level 4 Less Urgent',
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
              className={`text-left rounded-lg border p-3 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-start gap-2.5 cursor-pointer ${preset.color}`}
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
