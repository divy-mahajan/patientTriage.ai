import React from 'react';
import { Bed, User, Stethoscope, Zap, Heart, Wind, ShieldAlert, Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  available: {
    bg: 'bg-emerald-50/80 hover:bg-emerald-100/80',
    border: 'border-emerald-300',
    headerBg: 'bg-emerald-600 text-white',
    text: 'text-emerald-950',
    dot: 'bg-emerald-500',
    label: 'Available',
    statusBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  occupied: {
    bg: 'bg-slate-50/90 hover:bg-slate-100/90',
    border: 'border-slate-300',
    headerBg: 'bg-slate-800 text-white',
    text: 'text-slate-900',
    dot: 'bg-slate-500',
    label: 'Occupied',
    statusBadge: 'bg-slate-200 text-slate-800 border-slate-300'
  },
  cleaning: {
    bg: 'bg-amber-50/80 hover:bg-amber-100/80',
    border: 'border-amber-300',
    headerBg: 'bg-amber-500 text-white',
    text: 'text-amber-950',
    dot: 'bg-amber-500',
    label: 'Cleaning',
    statusBadge: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  reserved: {
    bg: 'bg-blue-50/80 hover:bg-blue-100/80',
    border: 'border-blue-300',
    headerBg: 'bg-clinical-primary-container text-white',
    text: 'text-blue-950',
    dot: 'bg-blue-500',
    label: 'Reserved',
    statusBadge: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  unavailable: {
    bg: 'bg-red-50/80 hover:bg-red-100/80',
    border: 'border-red-300',
    headerBg: 'bg-red-600 text-white',
    text: 'text-red-950',
    dot: 'bg-red-600',
    label: 'Unavailable',
    statusBadge: 'bg-red-100 text-red-800 border-red-300'
  }
};

export const BedTile = ({
  bed,
  unitName,
  isSelected = false,
  isRecommended = false,
  onClick
}) => {
  const status = (bed.status || 'available').toLowerCase();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.available;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border p-3 cursor-pointer transition-all duration-150 flex flex-col justify-between min-h-[140px] shadow-2xs ${
        config.bg
      } ${config.border} ${
        isSelected ? 'ring-3 ring-blue-600 shadow-md scale-102' : ''
      } ${
        isRecommended ? 'ring-2 ring-emerald-500 shadow-emerald-100' : ''
      }`}
    >
      {/* Recommended Tag */}
      {isRecommended && (
        <div className="absolute -top-2.5 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
          <Sparkles className="h-2.5 w-2.5" />
          AI MATCH
        </div>
      )}

      {/* Top Bar: Bed Label & Status */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-extrabold text-xs text-clinical-text-primary">
              {bed.bed_label || bed.bed_id}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              ({bed.bed_id})
            </span>
          </div>

          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${config.statusBadge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>

        {/* Patient / Occupant Info if occupied */}
        {status === 'occupied' ? (
          <div className="rounded border border-slate-200 bg-white/90 p-2 my-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 truncate">
              <User className="h-3 w-3 text-slate-500 shrink-0" />
              <span>{bed.current_patient_id || bed.assigned_patient_id || 'Patient Assigned'}</span>
            </div>
            {bed.assigned_doctor_id && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mt-0.5 truncate">
                <Stethoscope className="h-3 w-3 text-blue-600 shrink-0" />
                <span>MD: {bed.assigned_doctor_id}</span>
              </div>
            )}
          </div>
        ) : status === 'cleaning' ? (
          <div className="rounded border border-amber-200 bg-amber-100/50 p-2 my-1 text-[11px] text-amber-900 font-semibold">
            <span>Terminal Disinfection In Progress</span>
          </div>
        ) : status === 'unavailable' ? (
          <div className="rounded border border-red-200 bg-red-100/50 p-2 my-1 text-[11px] text-red-900 font-semibold truncate">
            <span>{bed.notes || 'HVAC / Equipment Maintenance'}</span>
          </div>
        ) : (
          <div className="py-2 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>Ready for Immediate Intake</span>
          </div>
        )}
      </div>

      {/* Equipment Badges */}
      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-200/60">
        {bed.equipment && bed.equipment.slice(0, 3).map((eq, i) => (
          <span
            key={i}
            className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-700 border border-slate-200"
          >
            {eq.replace('_', ' ')}
          </span>
        ))}
        {bed.equipment && bed.equipment.length > 3 && (
          <span className="text-[9px] text-slate-500 font-mono self-center">
            +{bed.equipment.length - 3}
          </span>
        )}
      </div>
    </div>
  );
};

export default BedTile;
