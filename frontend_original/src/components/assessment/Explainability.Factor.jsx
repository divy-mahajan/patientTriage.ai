import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, ShieldAlert } from 'lucide-react';

export const ExplainabilityFactor = ({ factor, detail, contribution, severityImpact = 'moderate' }) => {
  const impactStyles = {
    critical: {
      border: 'border-red-300 bg-red-50/70',
      badge: 'bg-red-600 text-white',
      icon: ShieldAlert,
      textColor: 'text-red-950'
    },
    high: {
      border: 'border-orange-300 bg-orange-50/70',
      badge: 'bg-orange-500 text-white',
      icon: AlertTriangle,
      textColor: 'text-orange-950'
    },
    moderate: {
      border: 'border-amber-300 bg-amber-50/60',
      badge: 'bg-amber-500 text-white',
      icon: TrendingUp,
      textColor: 'text-amber-950'
    },
    low: {
      border: 'border-slate-200 bg-slate-50',
      badge: 'bg-slate-500 text-white',
      icon: CheckCircle,
      textColor: 'text-slate-900'
    }
  }[severityImpact.toLowerCase()] || {
    border: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-500 text-white',
    icon: TrendingUp,
    textColor: 'text-slate-900'
  };

  const Icon = impactStyles.icon;

  return (
    <div className={`rounded-xl border p-3.5 transition-all shadow-2xs ${impactStyles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white shadow-2xs mt-0.5">
            <Icon className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <h4 className={`text-xs font-bold ${impactStyles.textColor}`}>
              {factor}
            </h4>
            <p className="mt-0.5 text-xs text-slate-700 font-medium">
              {detail}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${impactStyles.badge}`}>
            {severityImpact}
          </span>
          {contribution != null && (
            <span className="block mt-1 font-mono text-xs font-bold text-slate-600">
              {contribution > 0 ? `+${contribution}` : contribution}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplainabilityFactor;
