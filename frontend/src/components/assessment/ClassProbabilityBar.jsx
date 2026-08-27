import React from 'react';

const LEVEL_COLORS = {
  1: { bg: 'bg-red-600', text: 'text-red-700', label: 'Level 1: Resuscitation' },
  2: { bg: 'bg-orange-500', text: 'text-orange-700', label: 'Level 2: Emergent' },
  3: { bg: 'bg-amber-500', text: 'text-amber-700', label: 'Level 3: Urgent' },
  4: { bg: 'bg-emerald-600', text: 'text-emerald-700', label: 'Level 4: Less Urgent' },
  5: { bg: 'bg-slate-500', text: 'text-slate-700', label: 'Level 5: Non-Urgent' }
};

export const ClassProbabilityBar = ({ probabilities = {}, predictedLevel = 2 }) => {
  // Probabilities is an object: { "1": 0.05, "2": 0.82, "3": 0.11, "4": 0.01, "5": 0.01 }
  const levels = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-clinical-text-secondary font-bold uppercase tracking-wider">
        <span>Acuity Probability Distribution</span>
        <span className="font-mono text-slate-500">Multi-class Softmax</span>
      </div>

      {/* Stacked Progress Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5 border border-slate-200">
        {levels.map((lvl) => {
          const prob = probabilities[lvl.toString()] || probabilities[lvl] || 0;
          const pct = Math.round(prob * 100);
          if (pct <= 0) return null;

          return (
            <div
              key={lvl}
              style={{ width: `${pct}%` }}
              className={`h-full rounded-full transition-all duration-500 ${LEVEL_COLORS[lvl].bg}`}
              title={`Level ${lvl}: ${pct}%`}
            />
          );
        })}
      </div>

      {/* Probability Items List */}
      <div className="grid grid-cols-5 gap-2 pt-1">
        {levels.map((lvl) => {
          const prob = probabilities[lvl.toString()] || probabilities[lvl] || 0;
          const pct = Math.round(prob * 100);
          const isWinner = lvl === predictedLevel;

          return (
            <div
              key={lvl}
              className={`rounded-lg border p-2 text-center transition-all ${
                isWinner
                  ? 'border-slate-800 bg-slate-900 text-white shadow-xs scale-102'
                  : 'border-clinical-border bg-white text-slate-700'
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider opacity-75">
                ESI {lvl}
              </span>
              <span className={`block text-sm font-extrabold font-mono mt-0.5 ${isWinner ? 'text-white' : LEVEL_COLORS[lvl].text}`}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassProbabilityBar;
