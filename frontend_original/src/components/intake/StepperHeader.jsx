import React from 'react';
import { Check, User, FileText, Activity, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Patient Info', subtitle: 'Demographics & Mode', icon: User },
  { id: 2, title: 'Chief Complaint', subtitle: 'Symptoms & History', icon: FileText },
  { id: 3, title: 'Vital Signs', subtitle: 'Physiological Vitals', icon: Activity },
  { id: 4, title: 'AI Assessment', subtitle: 'Risk & Triage Scoring', icon: Sparkles },
];

export const StepperHeader = ({ currentStep = 1, onStepClick }) => {
  return (
    <div className="w-full bg-white rounded-xl border border-clinical-border p-4 mb-6 shadow-2xs">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`flex items-center gap-3 cursor-pointer group ${
                  isCurrent ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-50'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-bold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-clinical-primary-container border-clinical-primary-container text-white shadow-md'
                      : 'bg-slate-50 border-slate-300 text-slate-500 group-hover:border-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5 stroke-[2.5]" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="hidden md:block text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Step 0{step.id}
                  </span>
                  <span className={`text-xs font-bold ${isCurrent ? 'text-clinical-primary-container' : 'text-slate-800'}`}>
                    {step.title}
                  </span>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 mx-3 h-0.5 transition-colors duration-200 ${
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
