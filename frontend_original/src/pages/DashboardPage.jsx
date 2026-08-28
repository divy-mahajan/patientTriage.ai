import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Bed,
  HeartPulse,
  Stethoscope,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import VitalBadge from '../components/VitalBadge';
import CapacityBar from '../components/CapacityBar';
import ClinicalTooltip from '../components/ClinicalTooltip';
import useCountUp from '../hooks/useCountUp';
import { patientsAPI, hospitalAPI, doctorsAPI, reassessmentAPI } from '../services/api';

export function DashboardPage({ onNewPatient, onSelectPatient }) {
  const [acuityFilter, setAcuityFilter] = useState('all');
  const [patients, setPatients] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch live clinical data from FastAPI backend
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [patientsRes, capacityRes, doctorsRes, alertsRes] = await Promise.all([
        patientsAPI.listPatients(),
        hospitalAPI.getCapacity().catch(() => null),
        doctorsAPI.listRoster().catch(() => ({ doctors: [] })),
        reassessmentAPI.getAlerts().catch(() => ({ alerts: [] })),
      ]);

      setPatients(patientsRes.patients || []);
      setCapacity(capacityRes || null);
      setDoctors(doctorsRes.doctors || []);
      setAlerts(alertsRes.alerts || []);
    } catch (err) {
      console.error('Error fetching live dashboard data:', err);
      setError('Unable to connect to the triage server. Please check that the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const handleProfileSwapped = () => {
      loadDashboardData();
    };
    window.addEventListener('hospital-profile-swapped', handleProfileSwapped);
    return () => window.removeEventListener('hospital-profile-swapped', handleProfileSwapped);
  }, [loadDashboardData]);

  // Derived live metrics from backend
  const waitingOccupancy = capacity?.waiting_room?.current_occupancy ?? 0;
  const waitingCapacity = capacity?.waiting_room?.capacity ?? 45;
  const waitingPercent = Math.round((waitingOccupancy / waitingCapacity) * 100);
  const avgWaitMinutes = capacity?.waiting_room?.average_wait_minutes ?? 0;

  const totalBeds = capacity?.summary?.total_beds ?? 24;
  const availableBeds = capacity?.summary?.available_beds ?? 0;
  const occupiedBeds = capacity?.summary?.occupied_beds ?? 0;
  const cleaningBeds = capacity?.summary?.cleaning_beds ?? 0;
  const reservedBeds = (capacity?.summary?.reserved_beds || 0) + (capacity?.summary?.unavailable_beds || 0);
  const freeBedPercent = totalBeds > 0 ? Math.round((availableBeds / totalBeds) * 100) : 0;

  // Active physicians from backend
  const activeDoctors = doctors.filter((d) => d.shift_status === 'Active Shift');
  const activePhysiciansCount = activeDoctors.length;
  const totalCaseload = activeDoctors.reduce((sum, d) => sum + (d.current_caseload || 0), 0);
  const avgCaseload = activePhysiciansCount > 0 ? (totalCaseload / activePhysiciansCount).toFixed(1) : '0.0';

  // High-acuity cases computed dynamically from patient vitals and priority
  const criticalPatients = patients.filter((p) => {
    const isCriticalHr = p.heart_rate > 120 || p.heart_rate < 45;
    const isCriticalBp = p.sbp < 90 || p.sbp > 190;
    const isCriticalSpo2 = p.spo2 < 91;
    const isCriticalGcs = p.gcs < 13;
    return isCriticalHr || isCriticalBp || isCriticalSpo2 || isCriticalGcs || p.is_high_risk;
  });
  const highAcuityCount = criticalPatients.length;

  // Count-up animated numbers
  const animWaiting = useCountUp(waitingOccupancy, 600);
  const animAvailableBeds = useCountUp(availableBeds, 600);
  const animHighAcuity = useCountUp(highAcuityCount, 500);
  const animDoctors = useCountUp(activePhysiciansCount, 500);

  // Read canonical triage level directly from backend patient assessment
  const getPatientLevel = (p) => {
    if (typeof p?.predicted_triage_level === 'number' && p.predicted_triage_level >= 1 && p.predicted_triage_level <= 5) {
      return p.predicted_triage_level;
    }
    if (typeof p?.triage_level === 'number' && p.triage_level >= 1 && p.triage_level <= 5) {
      return p.triage_level;
    }
    return 3;
  };

  // Live dynamic counts per triage acuity tier
  const countAll = patients.length;
  const countL1 = patients.filter((p) => getPatientLevel(p) === 1).length;
  const countL2 = patients.filter((p) => getPatientLevel(p) === 2).length;
  const countL3 = patients.filter((p) => getPatientLevel(p) === 3).length;
  const countStandard = patients.filter((p) => {
    const t = getPatientLevel(p);
    return t === 4 || t === 5;
  }).length;

  // Filter patients based on selected tab
  const filteredPatients = patients.filter((p) => {
    const tier = getPatientLevel(p);
    if (acuityFilter === 'l1') return tier === 1;
    if (acuityFilter === 'l2') return tier === 2;
    if (acuityFilter === 'l3') return tier === 3;
    if (acuityFilter === 'standard') return tier === 4 || tier === 5;
    return true; // 'all'
  });

  // Calculate live wait time from arrival timestamp
  const calculateWaitTime = (arrivalTimestamp) => {
    if (!arrivalTimestamp) return '0m';
    const arrival = new Date(arrivalTimestamp);
    const now = new Date();
    const diffMins = Math.max(0, Math.floor((now - arrival) / (1000 * 60)));
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Helper for monitoring badge color & label
  const getMonitoringBadge = (p) => {
    const status = p.monitoring_status || 'STABLE';
    if (status === 'DETERIORATING') {
      return {
        label: 'DETERIORATING',
        className: 'bg-red-50 text-red-800 border-red-200',
      };
    }
    if (status === 'CLINICIAN REVIEW') {
      return {
        label: 'CLINICIAN REVIEW',
        className: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    }
    if (status === 'REASSESSMENT DUE') {
      return {
        label: 'REASSESSMENT DUE',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    if (status === 'MONITORING') {
      return {
        label: 'MONITORING',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    }
    return {
      label: 'STABLE',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Clinical Operations</span>
            <span>•</span>
            <span>Real-Time Triage & Monitoring</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Triage Dashboard & Patient Queue
          </h1>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNewPatient}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Intake New Patient</span>
          </button>
        </div>
      </div>

      {/* Reassessment & Deterioration Alert Banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-800 font-bold text-xs border border-red-200">
                {alerts.length}
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-900">
                Active Deterioration & Reassessment Alerts
              </span>
            </div>
            <span className="text-[11px] text-red-700 font-semibold">Clinician Review Recommended</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alerts.slice(0, 4).map((alt) => {
              const matchedPatient = patients.find((pt) => pt.patient_id === alt.patient_id);
              return (
                <div
                  key={alt.alert_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-2xs gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">{alt.patient_name}</span>
                      <SeverityBadge level={alt.current_level} size="sm" />
                      <span className="text-[10px] font-mono text-slate-400">({alt.patient_id})</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                      {alt.message}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => matchedPatient && onSelectPatient(matchedPatient)}
                    className="shrink-0 px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    Review Patient
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4 text-xs font-semibold text-red-800">
          <div className="flex items-center gap-2">
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="px-3 py-1 bg-white border border-red-200 rounded font-bold hover:bg-red-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Metric Grid — Clean White Cards with Neutral Borders */}
      {isLoading && !capacity ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-clinical-border rounded-xl p-5 shadow-2xs animate-pulse space-y-3">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-8 bg-slate-100 rounded w-16"></div>
              <div className="h-2 bg-slate-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Lobby Occupancy */}
          <div className="bg-white border border-clinical-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lobby Occupancy</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  waitingPercent > 80
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {waitingPercent}% Capacity
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">{animWaiting}</span>
              <span className="text-xs text-slate-500 font-normal font-sans">/ {waitingCapacity} capacity</span>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Current Waiting</span>
                <span>Avg wait: {avgWaitMinutes}m</span>
              </div>
              <CapacityBar current={waitingOccupancy} max={waitingCapacity} showPercent={false} />
            </div>
          </div>

          {/* Card 2: Available ED Beds */}
          <div className="bg-white border border-clinical-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available ED Beds</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-200">
                {freeBedPercent}% Free
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700 font-mono">{animAvailableBeds}</span>
              <span className="text-xs text-slate-500 font-normal font-sans">/ {totalBeds} total beds</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{occupiedBeds} occupied</span>
              <span>·</span>
              <span>{cleaningBeds} cleaning</span>
              <span>·</span>
              <span>{reservedBeds} reserved</span>
            </div>
          </div>

          {/* Card 3: Critical Acuity */}
          <div className="bg-white border border-clinical-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Acuity (L1/L2)</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  highAcuityCount > 0
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {highAcuityCount > 0 ? 'High Priority' : 'Nominal'}
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-700 font-mono">{animHighAcuity}</span>
              <span className="text-xs text-slate-500 font-normal font-sans">active cases</span>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Physiological triggers</span>
              <span className="font-semibold text-slate-700">{highAcuityCount} monitored</span>
            </div>
          </div>

          {/* Card 4: Active Physicians */}
          <div className="bg-white border border-clinical-border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Physicians</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
                On Shift
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">{animDoctors}</span>
              <span className="text-xs text-slate-500 font-normal font-sans">physicians in ED</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Avg caseload: {avgCaseload} / MD</span>
              <span className="font-semibold text-slate-700">{totalCaseload} assigned</span>
            </div>
          </div>
        </div>
      )}

      {/* Patient Queue Card & Filters */}
      <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden space-y-0">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-clinical-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 text-sm">Active Patient Queue</h2>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {patients.length} Total Patients
            </span>
          </div>

          {/* Acuity Filter Tabs matching Physician Roster specialty tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setAcuityFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                acuityFilter === 'all'
                  ? 'bg-clinical-primary-container text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All ({countAll})
            </button>
            <button
              type="button"
              onClick={() => setAcuityFilter('l1')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                acuityFilter === 'l1'
                  ? 'bg-clinical-primary-container text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              L1 ({countL1})
            </button>
            <button
              type="button"
              onClick={() => setAcuityFilter('l2')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                acuityFilter === 'l2'
                  ? 'bg-clinical-primary-container text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              L2 ({countL2})
            </button>
            <button
              type="button"
              onClick={() => setAcuityFilter('l3')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                acuityFilter === 'l3'
                  ? 'bg-clinical-primary-container text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              L3 ({countL3})
            </button>
            <button
              type="button"
              onClick={() => setAcuityFilter('standard')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                acuityFilter === 'standard'
                  ? 'bg-clinical-primary-container text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Standard ({countStandard})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading && patients.length === 0 ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">
              Loading live patient records from FastAPI...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">
              No patients in queue matching filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-clinical-border bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Acuity</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Chief Complaint</th>
                  <th className="py-3 px-4">Vital Signs</th>
                  <th className="py-3 px-4">Monitoring</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((p) => {
                  const tier = getPatientLevel(p);
                  const monBadge = getMonitoringBadge(p);
                  return (
                    <tr
                      key={p.patient_id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* Acuity Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge level={tier} variant="subtle" size="sm" />
                          {p.is_high_risk && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-800 border border-red-200 uppercase tracking-wider">
                              High Risk
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient Identifier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div
                          className="font-bold text-slate-900 hover:text-clinical-primary-container transition-colors cursor-pointer"
                          onClick={() => onSelectPatient(p)}
                        >
                          {p.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{p.patient_id}</span>
                          <span>•</span>
                          <span>{p.age < 18 ? 'Pediatric' : p.age >= 65 ? 'Geriatric' : 'Adult'} ({p.age}y)</span>
                        </div>
                      </td>

                      {/* Complaint */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <ClinicalTooltip content={p.chief_complaint} maxWidth={400}>
                          <div className="font-medium text-slate-800 truncate cursor-help">
                            {p.chief_complaint}
                          </div>
                        </ClinicalTooltip>
                      </td>

                      {/* Compact Vital Signs */}
                      <td className="py-3 px-4">
                        <VitalBadge
                          hr={p.heart_rate}
                          sbp={p.sbp}
                          dbp={p.dbp}
                          spo2={p.spo2}
                          rr={p.respiratory_rate}
                          gcs={p.gcs}
                          compact={true}
                        />
                      </td>

                      {/* Dynamic Monitoring Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${monBadge.className}`}
                        >
                          {monBadge.label}
                        </span>
                      </td>

                      {/* Wait Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <div className="font-semibold text-slate-900">{calculateWaitTime(p.arrival_timestamp)}</div>
                        <div className="text-slate-400 text-[10px]">{p.arrival_mode?.replace(' (EMS)', '')}</div>
                      </td>

                      {/* Workflow Status */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 capitalize">
                          {p.status || 'waiting'}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => onSelectPatient(p)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          Assess Patient
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
