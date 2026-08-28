import React from 'react';

/**
 * Compact Vital Sign Chip with physiological abnormal highlighting.
 */
export function VitalBadge({ hr, sbp, dbp, spo2, rr, gcs, compact = false }) {
  const isHrAbnormal = hr && (hr > 110 || hr < 50);
  const isBpAbnormal = sbp && (sbp < 90 || sbp > 180);
  const isSpo2Critical = spo2 && spo2 < 92;
  const isSpo2Warning = spo2 && spo2 >= 92 && spo2 < 95;
  const isRrAbnormal = rr && (rr > 24 || rr < 10);
  const isGcsAbnormal = gcs && gcs < 15;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 font-mono ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {/* Heart Rate */}
      {hr !== undefined && (
        <span
          title="Heart Rate"
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold border ${
            isHrAbnormal
              ? 'bg-red-50 text-severity-1 border-red-200'
              : 'bg-surface-bright text-on-surface border-border'
          }`}
        >
          <span className="text-[10px] text-text-secondary font-sans font-bold">HR</span>
          <span>{hr}</span>
        </span>
      )}

      {/* Blood Pressure */}
      {sbp !== undefined && dbp !== undefined && (
        <span
          title="Blood Pressure (SBP/DBP)"
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold border ${
            isBpAbnormal
              ? 'bg-red-50 text-severity-1 border-red-200'
              : 'bg-surface-bright text-on-surface border-border'
          }`}
        >
          <span className="text-[10px] text-text-secondary font-sans font-bold">BP</span>
          <span>{sbp}/{dbp}</span>
        </span>
      )}

      {/* Oxygen SpO2 */}
      {spo2 !== undefined && (
        <span
          title="Oxygen Saturation (SpO2)"
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold border ${
            isSpo2Critical
              ? 'bg-red-50 text-severity-1 border-red-200 font-bold'
              : isSpo2Warning
              ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
              : 'bg-surface-bright text-on-surface border-border'
          }`}
        >
          <span className="text-[10px] text-text-secondary font-sans font-bold">SpO₂</span>
          <span>{spo2}%</span>
        </span>
      )}

      {/* Respiratory Rate */}
      {rr !== undefined && (
        <span
          title="Respiratory Rate"
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold border ${
            isRrAbnormal
              ? 'bg-red-50 text-severity-1 border-red-200 font-bold'
              : 'bg-surface-bright text-on-surface border-border'
          }`}
        >
          <span className="text-[10px] text-text-secondary font-sans font-bold">RR</span>
          <span>{rr}</span>
        </span>
      )}

      {/* GCS Score */}
      {gcs !== undefined && (
        <span
          title="Glasgow Coma Scale"
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold border ${
            isGcsAbnormal
              ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
              : 'bg-surface-bright text-on-surface border-border'
          }`}
        >
          <span className="text-[10px] text-text-secondary font-sans font-bold">GCS</span>
          <span>{gcs}</span>
        </span>
      )}
    </div>
  );
}

export default VitalBadge;
