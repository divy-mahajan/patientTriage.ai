import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  ShieldAlert,
  Zap,
  Building2,
  Users,
  Bed,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  HeartPulse,
  Sparkles
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import MetricCard from '../components/common/MetricCard';
import SeverityBadge from '../components/common/SeverityBadge';
import VitalsPills from '../components/common/VitalsPills';

export const SurgePage = () => {
  const navigate = useNavigate();
  const {
    capacity,
    patients,
    updateSurgeStatus,
    swapProfile,
    addNotification,
    loading
  } = useHospital();

  const [updating, setUpdating] = useState(false);

  const currentSurge = capacity?.surge_status || 'normal';
  const isCritical = currentSurge === 'critical';
  const isElevated = currentSurge === 'elevated';

  const summary = capacity?.summary || {};
  const waitingRoom = capacity?.waiting_room || {};
  const waitingRatio = Math.round(((waitingRoom.current_occupancy || 0) / Math.max(1, waitingRoom.capacity || 45)) * 100);

  // Critical Patients Queue (L1 / L2 or unstable vitals)
  const criticalPatients = patients.filter(
    p => p.predicted_triage_level === 1 || p.predicted_triage_level === 2 || p.spo2 < 91 || p.heart_rate > 120 || p.sbp < 90
  );

  const handleSetSurge = async (status) => {
    try {
      setUpdating(true);
      await updateSurgeStatus(status);
    } catch (err) {
      console.error('Surge update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSwapHospital = async (profileId) => {
    try {
      setUpdating(true);
      await swapProfile(profileId);
    } catch (err) {
      console.error('Profile swap error:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Surge Crisis Hero Banner */}
      <div className={`rounded-xl border-2 p-6 shadow-md ${
        isCritical
          ? 'border-red-600 bg-red-700 text-white animate-pulse-fast'
          : isElevated
          ? 'border-amber-500 bg-amber-600 text-white'
          : 'border-slate-300 bg-slate-900 text-white'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <AlertOctagon className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest uppercase">
                  STATUS: {currentSurge.toUpperCase()}
                </span>
                <span className="text-xs opacity-80">· Live Hospital Crisis Operations</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                {isCritical
                  ? 'CRITICAL SURGE OVERLOAD — CRISIS PROTOCOLS ACTIVE'
                  : isElevated
                  ? 'ELEVATED SURGE ALERT — CAPACITY STRAINED'
                  : 'NORMAL OPERATIONS — STANDARD CAPACITY'}
              </h2>
              <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-3xl">
                {isCritical
                  ? 'ED patient inflow is exceeding normal resource limits. Activate emergency staffing call-in, ambulatory fast-tracking, and priority bed reallocation.'
                  : isElevated
                  ? 'Lobby congestion is trending upward. Prepare surge expansion beds and expedite discharge authorizations.'
                  : 'All units operating within baseline staffing and bed capacity thresholds.'}
              </p>
            </div>
          </div>

          {/* Quick Surge Mode Switcher */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/20">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleSetSurge('normal')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                currentSurge === 'normal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => handleSetSurge('elevated')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                currentSurge === 'elevated'
                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Elevated
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => handleSetSurge('critical')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                currentSurge === 'critical'
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Critical
            </button>
          </div>
        </div>
      </div>

      {/* Swappable Hospital Configuration Profile Card */}
      <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-clinical-primary-container" />
              <h3 className="text-sm font-bold text-slate-900">
                Hospital Profile & Capacity Infrastructure
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Active configuration: <span className="font-bold text-slate-900">{capacity?.name}</span> ({capacity?.emergency_level})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={updating || capacity?.hospital_id === 'st_marys_general'}
              onClick={() => handleSwapHospital('st_marys_general')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                capacity?.hospital_id === 'st_marys_general'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              St. Mary's General (24 Beds)
            </button>
            <button
              type="button"
              disabled={updating || capacity?.hospital_id === 'metro_trauma_center'}
              onClick={() => handleSwapHospital('metro_trauma_center')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                capacity?.hospital_id === 'metro_trauma_center'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Metro Trauma Center (36 Beds)
            </button>
          </div>
        </div>
      </div>

      {/* Surge Bento KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Lobby Congestion"
          value={`${waitingRatio}%`}
          subtitle={`${waitingRoom.current_occupancy || 0} / ${waitingRoom.capacity || 45} seats`}
          icon={Users}
          variant={waitingRatio > 85 ? 'critical' : waitingRatio > 60 ? 'warning' : 'default'}
          trend="+12/hr rate"
        />
        <MetricCard
          title="Immediate Acuity (L1/L2)"
          value={criticalPatients.length}
          subtitle="Requires immediate resuscitation / telemetry"
          icon={HeartPulse}
          variant={criticalPatients.length > 0 ? 'critical' : 'default'}
        />
        <MetricCard
          title="Hospital Bed Reserve"
          value={`${summary.available_beds || 0} / ${summary.total_beds || 24}`}
          subtitle={`${summary.occupied_beds || 0} beds currently occupied`}
          icon={Bed}
          variant={summary.available_beds < 4 ? 'critical' : 'success'}
        />
        <MetricCard
          title="Crisis Capacity Strain"
          value={isCritical ? '96%' : isElevated ? '78%' : '42%'}
          subtitle="Composite resource strain"
          icon={Activity}
          variant={isCritical ? 'critical' : isElevated ? 'warning' : 'default'}
        />
      </div>

      {/* Surge Protocols & Priority Critical Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Fast-Track Critical Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden">
            <div className="border-b border-clinical-border bg-slate-50 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-clinical-text-primary flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  Priority Fast-Track Critical Patient Queue ({criticalPatients.length})
                </h3>
                <p className="text-xs text-clinical-text-secondary">
                  Patients requiring immediate clinician intervention and bed routing.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {criticalPatients.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No high-acuity critical patients in queue.
                </div>
              ) : (
                criticalPatients.map((p) => (
                  <div key={p.patient_id} className="p-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {p.full_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({p.patient_id}) · {p.age}y · {p.gender}
                        </span>
                        <SeverityBadge level={p.predicted_triage_level || 2} size="sm" />
                      </div>
                      <p className="text-xs text-slate-700 italic truncate max-w-md">
                        "{p.chief_complaint}"
                      </p>
                      <VitalsPills
                        heartRate={p.heart_rate}
                        sbp={p.sbp}
                        dbp={p.dbp}
                        spo2={p.spo2}
                        respiratoryRate={p.respiratory_rate}
                        temperatureC={p.temperature_c}
                        gcs={p.gcs}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/assessment/${encodeURIComponent(p.patient_id)}`)}
                        className="rounded-lg bg-clinical-primary-container text-white px-3 py-1.5 text-xs font-bold hover:bg-clinical-primary transition shadow-2xs"
                      >
                        Triage Review
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/beds', { state: { selectedPatient: p } })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      >
                        Assign Bed
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: AI Surge Crisis Protocol Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-clinical-border pb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-clinical-text-primary">
                Crisis Standard Operating Protocols
              </h3>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs space-y-1">
                <span className="font-bold text-blue-950 block">1. Fast-Track ESI 4/5 Patients</span>
                <p className="text-slate-700 leading-tight">
                  Route non-urgent complaints (suture removals, simple abrasions) directly to ambulatory outpatient chairs.
                </p>
              </div>

              <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-xs space-y-1">
                <span className="font-bold text-purple-950 block">2. Automated Respiratory Therapy Paging</span>
                <p className="text-slate-700 leading-tight">
                  Auto-page RT and prep non-invasive CPAP/BiPAP for all SpO2 &lt; 92% walk-in arrivals.
                </p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-1">
                <span className="font-bold text-emerald-950 block">3. Inpatient Rapid Discharge Handoff</span>
                <p className="text-slate-700 leading-tight">
                  Accelerate pending final MD sign-offs and transit staging to free acute telemetry beds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurgePage;
