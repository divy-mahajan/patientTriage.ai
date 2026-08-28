import React, { useState, useEffect, useCallback } from 'react';
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
import { hospitalAPI, surgeAPI, patientsAPI } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import SeverityBadge from '../components/common/SeverityBadge';
import VitalsPills from '../components/common/VitalsPills';

export function SurgeModePage() {
  const [capacity, setCapacity] = useState(null);
  const [patients, setPatients] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [surgeData, setSurgeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [capRes, ptsRes, profRes, surgeRes] = await Promise.all([
        hospitalAPI.getCapacity().catch(() => null),
        patientsAPI.listPatients().catch(() => ({ patients: [] })),
        hospitalAPI.listProfiles().catch(() => ({ profiles: [] })),
        surgeAPI.getSurgeStatus().catch(() => ({ status: 'normal', is_surge_active: false })),
      ]);

      if (capRes) setCapacity(capRes);
      setPatients(ptsRes.patients || []);
      setProfiles(profRes.profiles || []);
      setSurgeData(surgeRes);
    } catch (err) {
      console.error('Error loading surge page data:', err);
      setError('Unable to load real-time surge parameters.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentSurge = surgeData?.surge_tier || (surgeData?.is_surge_active ? 'critical' : 'normal');
  const isCritical = currentSurge === 'critical' || currentSurge === 'disaster' || currentSurge === 'tier_2';
  const isElevated = currentSurge === 'elevated' || currentSurge === 'tier_1';

  const summary = capacity?.summary || {};
  const waitingRoom = capacity?.waiting_room || {};
  const waitingOccupancy = waitingRoom.current_occupancy || 0;
  const waitingCap = waitingRoom.capacity || 45;
  const waitingRatio = Math.round((waitingOccupancy / Math.max(1, waitingCap)) * 100);

  // Critical Patients Queue (L1 / L2 or unstable vitals)
  const criticalPatients = patients.filter(
    (p) =>
      p.predicted_triage_level === 1 ||
      p.predicted_triage_level === 2 ||
      p.triage_level === 1 ||
      p.triage_level === 2 ||
      p.spo2 < 91 ||
      p.heart_rate > 120 ||
      p.sbp < 90 ||
      p.gcs < 13
  );

  const handleSetSurge = async (tier) => {
    setIsUpdating(true);
    try {
      await surgeAPI.toggleSurgeMode(tier, `Surge set to ${tier}`);
      await loadData();
    } catch (err) {
      console.error('Surge update error:', err);
      alert('Failed to update surge mode: ' + (err.message || 'Error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSwapHospital = async (profileId) => {
    setIsUpdating(true);
    try {
      await hospitalAPI.swapProfile(profileId);
      await loadData();
    } catch (err) {
      console.error('Profile swap error:', err);
      alert('Failed to swap profile: ' + (err.message || 'Error'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Surge Crisis Hero Banner */}
      <div
        className={`rounded-xl border-2 p-6 shadow-md transition-all ${
          isCritical
            ? 'border-red-600 bg-red-700 text-white animate-pulse-fast'
            : isElevated
            ? 'border-amber-500 bg-amber-600 text-white'
            : 'border-slate-300 bg-slate-900 text-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <AlertOctagon className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest uppercase">
                  STATUS: {isCritical ? 'CRITICAL SURGE' : isElevated ? 'ELEVATED SURGE' : 'NORMAL OPERATIONS'}
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
                  ? 'Automated hallway overflow beds engaged. Fast-track routing enabled for ESI 4 & 5. Emergency physician callback triggered.'
                  : isElevated
                  ? 'High lobby intake detected. Expedited lab turnarounds and pending discharge handoffs prioritized.'
                  : 'Emergency department operating within nominal nurse-patient ratios and bed turn-around buffers.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleSetSurge(isCritical ? 'normal' : 'tier_2')}
              className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                isCritical
                  ? 'bg-white text-red-900 hover:bg-slate-100'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isCritical ? 'De-escalate to Normal' : 'Declare Critical Surge'}
            </button>
          </div>
        </div>
      </div>

      {/* 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Lobby Occupancy"
          value={`${waitingOccupancy} / ${waitingCap}`}
          subtitle={`${waitingRatio}% capacity`}
          icon={Users}
          variant={waitingRatio > 80 ? 'critical' : waitingRatio > 60 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Available ED Beds"
          value={summary.available_beds ?? 0}
          subtitle={`Out of ${summary.total_beds ?? 24} total`}
          icon={Bed}
          variant={(summary.available_beds ?? 0) <= 2 ? 'critical' : 'default'}
        />
        <MetricCard
          title="High Acuity Cases"
          value={criticalPatients.length}
          subtitle="ESI 1–2 / Unstable Vitals"
          icon={HeartPulse}
          variant={criticalPatients.length > 3 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Surge Automation"
          value={isCritical ? 'Tier 2 Active' : 'Standby'}
          subtitle="Hallway & Fast-Track"
          icon={Zap}
          variant={isCritical ? 'critical' : 'default'}
        />
      </div>

      {/* 4-Tier Surge Escalation Matrix */}
      <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-clinical-text-primary flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-blue-600" />
          <span>Surge Escalation Levels & Protocols</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'tier_0',
              name: 'Normal Flow',
              tier: 'Tier 0',
              desc: 'Standard operations. Lobby < 70%, Beds > 25%.',
              badge: 'bg-emerald-100 text-emerald-800',
              active: !isCritical && !isElevated,
            },
            {
              id: 'tier_1',
              name: 'Elevated Volume',
              tier: 'Tier 1',
              desc: 'Lobby > 80% or available beds < 4. Fast-track ESI 4-5.',
              badge: 'bg-amber-100 text-amber-800',
              active: isElevated,
            },
            {
              id: 'tier_2',
              name: 'Critical Surge',
              tier: 'Tier 2',
              desc: 'Lobby > 100%, 0 available beds. Hallway surge beds prepped.',
              badge: 'bg-red-100 text-red-800',
              active: isCritical,
            },
            {
              id: 'tier_3',
              name: 'Disaster Divert',
              tier: 'Tier 3',
              desc: 'Mass Casualty Incident. Regional EMS divert protocol engaged.',
              badge: 'bg-purple-100 text-purple-800',
              active: false,
            },
          ].map((lvl) => (
            <div
              key={lvl.id}
              onClick={() => handleSetSurge(lvl.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                lvl.active
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-xs'
                  : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">{lvl.name}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${lvl.badge}`}>
                  {lvl.active ? 'ACTIVE' : lvl.tier}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{lvl.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Acuity Queue in Surge Mode */}
      {criticalPatients.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white font-bold text-xs">
                {criticalPatients.length}
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Critical Priority Patients Requiring Immediate Bed Placement
              </h3>
            </div>
            <span className="text-xs text-red-600 font-bold">Resuscitation & Emergent</span>
          </div>

          <div className="space-y-2.5">
            {criticalPatients.map((pt) => (
              <div
                key={pt.patient_id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-red-200 bg-red-50/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{pt.full_name}</span>
                    <span className="text-xs text-slate-500 font-mono">({pt.patient_id})</span>
                    <SeverityBadge level={pt.predicted_triage_level || pt.triage_level || 2} size="sm" />
                  </div>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">"{pt.chief_complaint}"</p>
                </div>

                <VitalsPills
                  heartRate={pt.heart_rate}
                  sbp={pt.sbp}
                  dbp={pt.dbp}
                  spo2={pt.spo2}
                  respiratoryRate={pt.respiratory_rate}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SurgeModePage;
