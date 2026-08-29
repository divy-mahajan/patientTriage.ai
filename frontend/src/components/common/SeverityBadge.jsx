import React from 'react';

const ESI_CONFIG = {
  1: {
    label: 'Level 1',
    name: 'Resuscitation',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-600',
    pulse: true,
    waitTime: 'Immediate (0m)'
  },
  2: {
    label: 'Level 2',
    name: 'Emergent',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    pulse: false,
    waitTime: '< 10 min'
  },
  3: {
    label: 'Level 3',
    name: 'Urgent',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    pulse: false,
    waitTime: '< 30 min'
  },
  4: {
    label: 'Level 4',
    name: 'Less Urgent',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
    pulse: false,
    waitTime: '< 60 min'
  },
  5: {
    label: 'Level 5',
    name: 'Non-Urgent',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-500',
    pulse: false,
    waitTime: '< 120 min'
  }
};

export const SeverityBadge = ({ level = 3, showName = true, showWait = false, size = 'md' }) => {
  const config = ESI_CONFIG[level] || ESI_CONFIG[3];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-bold',
  }[size] || 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${config.dot} ${config.pulse ? 'animate-ping' : ''}`} />
      <span>{config.label}</span>
      {showName && <span className="opacity-90 font-medium">· {config.name}</span>}
      {showWait && <span className="ml-1 text-[10px] uppercase tracking-wider opacity-75 font-mono">({config.waitTime})</span>}
    </span>
  );
};

export default SeverityBadge;
