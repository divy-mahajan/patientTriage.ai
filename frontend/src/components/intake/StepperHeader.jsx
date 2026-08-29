import React from 'react';
import { Check, User, FileText, Activity, Stethoscope, AlertTriangle, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Patient Info', subtitle: 'Demographics & Mode', icon: User },
  { id: 2, title: 'Chief Complaint', subtitle: 'Primary Complaint', icon: FileText },
  { id: 3, title: 'Vital Signs', subtitle: 'Physiological Vitals', icon: Activity },
  { id: 4, title: 'Symptoms', subtitle: 'Symptoms & Observations', icon: Stethoscope },
  { id: 5, title: 'History & Allergies', subtitle: 'Medical History', icon: AlertTriangle },
  { id: 6, title: 'Review & Assess', subtitle: 'Triage & Risk Score', icon: Sparkles },
];

export const StepperHeader = ({ currentStep = 1, onStepClick }) => {
  return (
    <div className="w-full bg-white rounded-xl border border-clinical-border p-3.5 mb-6 shadow-2xs overflow-x-auto">
      <div className="flex items-center justify-between min-w-[620px] gap-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`flex items-center gap-2.5 cursor-pointer group transition-all ${
                  isCurrent ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-50 hover:opacity-75'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-bold text-xs transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-300 text-slate-500 group-hover:border-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    0{step.id}
                  </span>
                  <span
                    className={`text-xs font-bold whitespace-nowrap block leading-tight ${
                      isCurrent ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 min-w-[16px] h-0.5 transition-colors duration-200 ${
                    currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepperHeader;
