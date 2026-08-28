import React from 'react';

/**
 * Visual capacity progress bar for waiting room and bed occupancies.
 */
export function CapacityBar({ current, max, label, showPercent = true, className = '' }) {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  
  // Status tiering: Normal (< 70%), Elevated (70-85%), Critical (> 85%)
  let statusColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';
  let statusText = 'Normal';
  
  if (percentage >= 85) {
    statusColor = 'bg-severity-1';
    textColor = 'text-severity-1';
    statusText = 'Critical';
  } else if (percentage >= 70) {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-700';
    statusText = 'Elevated';
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        {label && <span className="font-semibold text-text-secondary">{label}</span>}
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="text-on-surface font-mono">{current}/{max}</span>
          {showPercent && <span className={`text-[11px] font-bold ${textColor}`}>({percentage}%)</span>}
        </div>
      </div>
      <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${statusColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default CapacityBar;
