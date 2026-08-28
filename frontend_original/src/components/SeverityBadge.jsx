import React from 'react';

const SEVERITY_CONFIG = {
  1: {
    label: 'LEVEL 1 — RESUSCITATION',
    shortLabel: 'L1 RESUS',
    bg: 'bg-severity-1',
    text: 'text-white',
    border: 'border-severity-1',
    lightBg: 'bg-red-50 text-red-700 border-red-200',
  },
  2: {
    label: 'LEVEL 2 — EMERGENT',
    shortLabel: 'L2 EMERGENT',
    bg: 'bg-severity-2',
    text: 'text-white',
    border: 'border-severity-2',
    lightBg: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  3: {
    label: 'LEVEL 3 — URGENT',
    shortLabel: 'L3 URGENT',
    bg: 'bg-severity-3',
    text: 'text-neutral-900',
    border: 'border-severity-3',
    lightBg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  4: {
    label: 'LEVEL 4 — LESS URGENT',
    shortLabel: 'L4 LESS URGENT',
    bg: 'bg-severity-4',
    text: 'text-white',
    border: 'border-severity-4',
    lightBg: 'bg-green-50 text-green-800 border-green-200',
  },
  5: {
    label: 'LEVEL 5 — NON-URGENT',
    shortLabel: 'L5 NON-URGENT',
    bg: 'bg-severity-5',
    text: 'text-white',
    border: 'border-severity-5',
    lightBg: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export function SeverityBadge({ level, variant = 'solid', size = 'md', className = '' }) {
  const config = SEVERITY_CONFIG[level] || SEVERITY_CONFIG[3];
  
  if (variant === 'subtle') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${config.lightBg} ${className}`}>
        {config.shortLabel}
      </span>
    );
  }

  if (variant === 'pill') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
        {config.shortLabel}
      </span>
    );
  }

  // Large Solid Banner for Assessment
  if (size === 'lg') {
    return (
      <div className={`inline-block px-6 py-3 rounded ${config.bg} ${config.text} text-xl font-bold tracking-wide shadow-sm ${className}`}>
        {config.label}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold tracking-wide ${config.bg} ${config.text} ${className}`}>
      {config.label}
    </span>
  );
}

export default SeverityBadge;
