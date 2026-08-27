import React from 'react';
import { Activity, AlertTriangle, Users } from 'lucide-react';

export const CaseloadBarChart = ({ doctors = [] }) => {
  const activeDocs = doctors.filter(d => d.shift_status === 'Active Shift');

  if (activeDocs.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 italic">
        No active on-shift physicians recorded.
      </div>
    );
  }

  const totalPatients = activeDocs.reduce((acc, d) => acc + d.current_caseload, 0);
  const totalMax = activeDocs.reduce((acc, d) => acc + d.max_caseload, 0);
  const overallUtilization = Math.round((totalPatients / Math.max(1, totalMax)) * 100);

  return (
    <div className="space-y-4">
      {/* Overview Stat */}
      <div className="flex items-center justify-between border-b border-clinical-border pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-clinical-primary-container" />
          <span className="text-xs font-bold text-clinical-text-primary">
            Department Staffing Utilization ({activeDocs.length} MDs On Shift)
          </span>
        </div>
        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
          overallUtilization > 85 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {overallUtilization}% Total Load ({totalPatients}/{totalMax} pts)
        </span>
      </div>

      {/* Individual Doctor Workload Bars */}
      <div className="space-y-3">
        {activeDocs.map((doc) => {
          const pct = Math.round((doc.current_caseload / Math.max(1, doc.max_caseload)) * 100);
          const isOverloaded = pct >= 100;
          const isHeavy = pct >= 75 && pct < 100;

          return (
            <div key={doc.doctor_id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-900 truncate">
                    {doc.name}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                    ({doc.specialty})
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-700">
                  {doc.current_caseload}/{doc.max_caseload}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
                <div
                  style={{ width: `${Math.min(100, pct)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverloaded ? 'bg-red-600' : isHeavy ? 'bg-amber-500' : 'bg-clinical-primary-container'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaseloadBarChart;
