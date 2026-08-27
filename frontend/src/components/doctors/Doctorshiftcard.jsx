import React from 'react';
import { Stethoscope, User, Clock, ShieldCheck, Activity, Plus } from 'lucide-react';

export const DoctorShiftCard = ({
  doctor,
  isSelected = false,
  onSelect,
  onQuickAssign
}) => {
  const isAvailable = doctor.is_available && doctor.shift_status === 'Active Shift';
  const caseloadPct = Math.round((doctor.current_caseload / Math.max(1, doctor.max_caseload)) * 100);

  const statusBadge = {
    'Active Shift': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'On Break': 'bg-amber-100 text-amber-800 border-amber-300',
    'Off Duty': 'bg-slate-100 text-slate-600 border-slate-300'
  }[doctor.shift_status] || 'bg-slate-100 text-slate-700 border-slate-300';

  const progressColor = caseloadPct >= 100
    ? 'bg-red-600'
    : caseloadPct >= 75
    ? 'bg-amber-500'
    : 'bg-emerald-600';

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 bg-white shadow-2xs transition-all duration-150 flex flex-col justify-between cursor-pointer ${
        isSelected
          ? 'border-clinical-primary-container ring-2 ring-blue-500/30 shadow-md'
          : 'border-clinical-border hover:border-slate-400 hover:shadow-xs'
      }`}
    >
      <div>
        {/* Header: Photo, Name, Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-300">
                {doctor.name?.replace('Dr. ', '')?.slice(0, 2)?.toUpperCase() || 'MD'}
              </div>
              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-clinical-text-primary truncate">
                {doctor.name}
              </h4>
              <p className="text-xs text-clinical-primary-container font-semibold truncate">
                {doctor.specialty}
              </p>
            </div>
          </div>

          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0 ${statusBadge}`}>
            {doctor.shift_status}
          </span>
        </div>

        {/* Caseload Utilization Bar */}
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5 border border-slate-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold uppercase text-[10px]">
              Active Workload
            </span>
            <span className="font-mono font-bold text-slate-800">
              {doctor.current_caseload} / {doctor.max_caseload} pts ({caseloadPct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              style={{ width: `${Math.min(100, caseloadPct)}%` }}
              className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
            />
          </div>
        </div>
      </div>

      {/* Footer / Quick Action */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono">
          ID: {doctor.doctor_id}
        </span>
        {onQuickAssign && isAvailable && doctor.current_caseload < doctor.max_caseload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAssign(doctor);
            }}
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-bold text-clinical-primary-container hover:bg-blue-100 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign
          </button>
        )}
      </div>
    </div>
  );
};

export default DoctorShiftCard;
