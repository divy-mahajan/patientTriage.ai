import React from 'react';
import { AlertOctagon, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHospital } from '../../context/HospitalContext';

export const SurgeBanner = () => {
  const { capacity } = useHospital();
  const surgeStatus = capacity?.surge_status || 'normal';

  if (surgeStatus === 'normal') return null;

  const isCritical = surgeStatus === 'critical';

  return (
    <div
      className={`relative z-10 flex items-center justify-between px-6 py-2.5 text-xs font-semibold text-white shadow-md ${
        isCritical
          ? 'bg-red-700 animate-pulse-fast'
          : 'bg-amber-600'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
          <AlertOctagon className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-extrabold uppercase tracking-wide">
            {isCritical ? 'CRITICAL SURGE MODE ACTIVE' : 'ELEVATED SURGE ALERT'}
          </span>
          <span className="ml-2 font-normal opacity-90 hidden sm:inline">
            — Hospital occupancy above capacity threshold. Crisis standards of care and fast-track routing active.
          </span>
        </div>
      </div>

      <Link
        to="/surge"
        className="inline-flex items-center gap-1 rounded bg-white/20 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/30 transition shrink-0"
      >
        <span>Open Surge Console</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};

export default SurgeBanner;
