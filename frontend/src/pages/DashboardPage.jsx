import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertTriangle,
  Bed,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  Activity,
  HeartPulse,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  UserCheck
} from 'lucide-react';
import { patientsApi } from '../api/patientsApi';
import { hospitalApi } from '../api/hospitalApi';
import { doctorsApi } from '../api/doctorsApi';
import { reassessmentApi } from '../api/reassessmentApi';
import SeverityBadge from '../components/common/SeverityBadge';
import VitalsPills from '../components/common/VitalsPills';
import ClinicalTooltip from '../components/common/ClinicalTooltip';

export const DashboardPage = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [acuityFilter, setAcuityFilter] = useState('all');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ptsRes, capRes, docRes, altRes] = await Promise.all([
        patientsApi.listPatients({ limit: 100 }).catch(() => ({ patients: [] })),
        hospitalApi.getCapacity().catch(() => null),
        doctorsApi.listDoctors().catch(() => ({ doctors: [] })),
        reassessmentApi.getAlerts().catch(() => ({ alerts: [] })),
      ]);

      setPatients(ptsRes.patients || []);
      setCapacity(capRes);
      setDoctors(docRes.doctors || []);
      setAlerts(altRes.alerts || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Unable to load real-time triage data. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Dynamic Acuity Filter Counts
  const countAll = patients.length;
  const countL1 = patients.filter((p) => (p.predicted_triage_level || p.triage_level) === 1).length;
  const countL2 = patients.filter((p) => (p.predicted_triage_level || p.triage_level) === 2).length;
  const countL3 = patients.filter((p) => (p.predicted_triage_level || p.triage_level) === 3).length;
  const countStandard = patients.filter((p) => {
    const lvl = p.predicted_triage_level || p.triage_level || 3;
    return lvl === 4 || lvl === 5;
  }).length;

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Text search
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.patient_id?.toLowerCase().includes(q) ||
        p.chief_complaint?.toLowerCase().includes(q);

      // Acuity filter
      const lvl = p.predicted_triage_level || p.triage_level || 3;
      let matchAcuity = true;
      if (acuityFilter === 'l1') matchAcuity = lvl === 1;
      else if (acuityFilter === 'l2') matchAcuity = lvl === 2;
      else if (acuityFilter === 'l3') matchAcuity = lvl === 3;
      else if (acuityFilter === 'standard') matchAcuity = lvl === 4 || lvl === 5;

      return matchQuery && matchAcuity;
    });
  }, [patients, searchQuery, acuityFilter]);

  const summary = capacity?.summary || {
    total_beds: 24,
    available_beds: 0,
    occupied_beds: 0,
    cleaning_beds: 0,
  };

  const waitingRoom = capacity?.waiting_room || { current_occupancy: 0, capacity: 45 };

  const getMonitoringBadge = (p) => {
    const status = p.monitoring_status || 'STABLE';
    switch (status) {
      case 'DETERIORATING':
        return { label: 'Deteriorating', className: 'bg-red-50 text-red-800 border-red-200' };
      case 'CLINICIAN REVIEW':
        return { label: 'Review Req.', className: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'REASSESSMENT DUE':
        return { label: 'Reassess Due', className: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'MONITORING':
        return { label: 'Monitoring', className: 'bg-blue-50 text-blue-800 border-blue-200' };
      default:
        return { label: 'Stable', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
  };

  const calculateWaitTime = (arrivalIso) => {
    if (!arrivalIso) return 'Just now';
    try {
      const mins = Math.max(0, Math.floor((Date.now() - new Date(arrivalIso).getTime()) / 60000));
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Emergency Command</span>
            <span>•</span>
            <span>Live Triage Matrix</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Triage Dashboard & Clinical Command
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/intake')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2 text-xs font-bold hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            New Patient Intake
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4 text-xs font-semibold text-red-800">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-white border border-red-200 rounded font-bold hover:bg-red-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Real-Time Reassessment & Deterioration Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                {alerts.length}
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-950">
                Active Deterioration & Reassessment Alerts
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-red-700">Immediate Clinical Review Needed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alt) => (
              <div
                key={alt.alert_id}
                onClick={() => navigate(`/assessment/${encodeURIComponent(alt.patient_id)}`)}
                className="bg-white border border-red-200 rounded-xl p-3.5 shadow-2xs space-y-2 hover:border-red-400 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{alt.patient_name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{alt.patient_id}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      alt.severity === 'critical'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {alt.alert_type}
                  </span>
                </div>
                <p className="text-xs text-red-800 font-medium leading-relaxed">{alt.message}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-blue-700 font-bold">
                  <span>Open Assessment</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Hospital Operations Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Waiting Room Card */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ED Lobby Queue</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {waitingRoom.current_occupancy} <span className="text-xs font-normal text-slate-500">/ {waitingRoom.capacity} cap</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {Math.round((waitingRoom.current_occupancy / Math.max(1, waitingRoom.capacity)) * 100)}% Waiting room occupancy
          </div>
        </div>

        {/* Live Bed Matrix Card */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Bed Inventory</span>
            <Bed className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {summary.available_beds} <span className="text-xs font-normal text-slate-500">Available</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {summary.occupied_beds} Occupied · {summary.cleaning_beds} Cleaning · {summary.total_beds} Total
          </div>
        </div>

        {/* Active Doctors Roster Card */}
        <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Staffing</span>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {doctors.filter(d => d.is_available).length} <span className="text-xs font-normal text-slate-500">/ {doctors.length} On Shift</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Avg Caseload: {(doctors.reduce((sum, d) => sum + (d.current_caseload || 0), 0) / Math.max(1, doctors.length)).toFixed(1)} pts / MD
          </div>
        </div>
      </div>

      {/* Section 3: Active Patient Queue Table */}
      <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-clinical-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 text-sm">Active Patient Queue</h2>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {patients.length} Total Patients
            </span>
          </div>

          {/* Acuity Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setAcuityFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                acuityFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
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
                  ? 'bg-blue-600 text-white shadow-2xs'
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
                  ? 'bg-blue-600 text-white shadow-2xs'
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
                  ? 'bg-blue-600 text-white shadow-2xs'
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
                  ? 'bg-blue-600 text-white shadow-2xs'
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
              No patients found matching the selected filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Acuity</th>
                  <th className="py-3 px-4">Patient ID / Demographics</th>
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
                  const level = p.predicted_triage_level || p.triage_level || 3;
                  const monBadge = getMonitoringBadge(p);

                  return (
                    <tr key={p.patient_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Acuity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SeverityBadge level={level} size="sm" />
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">{p.full_name}</div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          {p.patient_id} · {p.age}y / {p.gender}
                        </div>
                      </td>

                      {/* Chief Complaint with Tooltip */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <ClinicalTooltip content={p.chief_complaint}>
                          <div className="truncate font-medium text-slate-700 cursor-help">
                            {p.chief_complaint}
                          </div>
                        </ClinicalTooltip>
                      </td>

                      {/* Vital Signs */}
                      <td className="py-3 px-4">
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
                      </td>

                      {/* Dynamic Monitoring Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${monBadge.className}`}>
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
                          onClick={() => navigate(`/assessment/${encodeURIComponent(p.patient_id)}`)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                        >
                          Review Assessment
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

      {/* Synthetic Prototype Disclaimer Banner */}
      <div className="text-center text-[11px] text-slate-400 font-medium pt-2">
        Synthetic data — prototype decision support — not clinically validated. Assumed jurisdiction: US FDA / EU MDR prototype research sandbox.
      </div>
    </div>
  );
};

export default DashboardPage;
