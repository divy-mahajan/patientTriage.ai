import React from 'react';

export const ConfidenceGauge = ({ value = 0.85, size = 110, strokeWidth = 9 }) => {
  // Value can be 0.0 - 1.0 or 0 - 100
  const normalizedValue = value > 1 ? value : Math.round(value * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  let colorClass = 'text-emerald-600';
  let label = 'High Confidence';
  let bgTint = 'bg-emerald-50 text-emerald-800 border-emerald-200';

  if (normalizedValue < 60) {
    colorClass = 'text-red-600';
    label = 'Uncertain / Boundary';
    bgTint = 'bg-red-50 text-red-800 border-red-200';
  } else if (normalizedValue < 80) {
    colorClass = 'text-amber-600';
    label = 'Moderate Confidence';
    bgTint = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            className="text-slate-100"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Animated progress circle */}
          <circle
            className={`${colorClass} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {/* Center Percentage */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-extrabold tracking-tight text-clinical-text-primary">
            {normalizedValue}%
          </span>
          <span className="text-[10px] font-semibold text-clinical-text-secondary uppercase">
            Score
          </span>
        </div>
      </div>
      <span className={`mt-2 inline-block rounded border px-2 py-0.5 text-[11px] font-bold ${bgTint}`}>
        {label}
      </span>
    </div>
  );
};

export default ConfidenceGauge;
