import React from 'react';
import { Heart, Activity, Wind, Thermometer, Brain, Gauge } from 'lucide-react';

export const VitalsPills = ({
  heartRate,
  sbp,
  dbp,
  spo2,
  respiratoryRate,
  temperatureC,
  gcs,
  size = 'md' // 'sm' | 'md' | 'lg'
}) => {
  // Clinical abnormality checks
  const isHrAbnormal = heartRate > 105 || heartRate < 55;
  const isBpAbnormal = sbp > 160 || sbp < 90 || dbp > 100 || dbp < 55;
  const isSpo2Critical = spo2 < 90;
  const isSpo2Abnormal = spo2 < 94;
  const isRrAbnormal = respiratoryRate > 22 || respiratoryRate < 10;
  const isTempAbnormal = temperatureC >= 38.2 || temperatureC <= 35.5;
  const isGcsAbnormal = gcs < 15;

  const pillClass = (isCritical, isAbnormal) => {
    if (isCritical) return 'bg-red-50 text-red-900 border-red-300 font-semibold';
    if (isAbnormal) return 'bg-amber-50 text-amber-900 border-amber-300 font-semibold';
    return 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const padClass = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs';

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono">
      {/* BP */}
      {(sbp != null || dbp != null) && (
        <div className={`inline-flex items-center gap-1 rounded border ${padClass} ${pillClass(false, isBpAbnormal)}`}>
          <Activity className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-500 font-sans font-medium text-[10px] uppercase">BP:</span>
          <span>{sbp || '-'}/{dbp || '-'}</span>
          <span className="text-[10px] text-slate-400 font-sans">mmHg</span>
        </div>
      )}

      {/* HR */}
      {heartRate != null && (
        <div className={`inline-flex items-center gap-1 rounded border ${padClass} ${pillClass(heartRate > 130 || heartRate < 45, isHrAbnormal)}`}>
          <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span className="text-slate-500 font-sans font-medium text-[10px] uppercase">HR:</span>
          <span>{heartRate}</span>
          <span className="text-[10px] text-slate-400 font-sans">bpm</span>
        </div>
      )}

      {/* SpO2 */}
      {spo2 != null && (
        <div className={`inline-flex items-center gap-1 rounded border ${padClass} ${pillClass(isSpo2Critical, isSpo2Abnormal)}`}>
          <Gauge className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-slate-500 font-sans font-medium text-[10px] uppercase">SpO2:</span>
          <span>{spo2}%</span>
        </div>
      )}

      {/* RR */}
      {respiratoryRate != null && (
        <div className={`inline-flex items-center gap-1 rounded border ${padClass} ${pillClass(respiratoryRate > 30, isRrAbnormal)}`}>
          <Wind className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <span className="text-slate-500 font-sans font-medium text-[10px] uppercase">RR:</span>
          <span>{respiratoryRate}</span>
          <span className="text-[10px] text-slate-400 font-sans">/m</span>
        </div>
      )}

      {/* Temp */}
      {temperatureC != null && (
        <div className={`inline-flex items-center gap-1 rounded border ${padClass} ${pillClass(temperatureC >= 39.0, isTempAbnormal)}`}>
          <Thermometer className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <span className="text-slate-500 font-sans font-medium text-[10px] uppercase">Temp:</span>
          <span>{Number(temperatureC).toFixed(1)}°C</span>
        </div>
      )}

      {/* GCS */}
      {gcs != null && (
        <div className={`inline-flex items-center gap-1 rounded border ${padClass} ${pillClass(gcs <= 8, isGcsAbnormal)}`}>
          <Brain className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-slate-500 font-sans font-medium text-[10px] uppercase">GCS:</span>
          <span>{gcs}/15</span>
        </div>
      )}
    </div>
  );
};

export default VitalsPills;
