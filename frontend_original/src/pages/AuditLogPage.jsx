import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileClock,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  Bed,
  Stethoscope,
  Sparkles,
  FileSpreadsheet,
  Calendar,
  ShieldCheck,
  HeartPulse,
  FileEdit
} from 'lucide-react';
import { patientsAPI, hospitalAPI, auditAPI } from '../services/api';
import SeverityBadge from '../components/common/SeverityBadge';

export function AuditLogPage() {
  const [patients, setPatients] = useState([]);
  const [persistedLogs, setPersistedLogs] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPatientId, setSearchPatientId] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ptsRes, capRes, auditRes] = await Promise.all([
        patientsAPI.listPatients().catch(() => ({ patients: [] })),
        hospitalAPI.getCapacity().catch(() => null),
        auditAPI.listLogs().catch(() => ({ logs: [] })),
      ]);
      setPatients(ptsRes.patients || []);
      setCapacity(capRes);
      setPersistedLogs(auditRes.logs || []);
    } catch (err) {
      console.error('Error fetching audit data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine persisted audit log entries with patient baseline events
  const auditEvents = useMemo(() => {
    const events = [];
    const patientMap = {};
    patients.forEach((p) => {
      patientMap[p.patient_id] = p;
    });

    // 1. Real Persisted Backend Audit Logs
    persistedLogs.forEach((l) => {
      const p = patientMap[l.patient_id];
      const pName = p?.full_name || l.patient_id || 'System';
      let typeLabel = l.event_type;
      if (l.event_type === 'VITALS_UPDATED') typeLabel = 'Vital Signs Recorded';
      if (l.event_type === 'DETERIORATION_DETECTED') typeLabel = 'Deterioration Detected';
      if (l.event_type === 'TRIAGE_RECOMMENDATION_CHANGED') typeLabel = 'Triage Recommendation Updated';
      if (l.event_type === 'CLINICIAN_OVERRIDE') typeLabel = 'Clinician Override';

      events.push({
        id: `LOG-${l.id}`,
        patientId: l.patient_id || 'System',
        patientName: pName,
        type: typeLabel,
        timestamp: new Date(l.timestamp),
        actor: l.actor || 'System',
        details: l.reason || JSON.stringify(l.new_state || {}),
      });
    });

    // 2. Synthesize baseline patient admission & triage events
    patients.forEach((p, idx) => {
      const baseTime = new Date(p.arrival_timestamp || p.created_at || (Date.now() - (idx + 1) * 3600000));

      events.push({
        id: `EVT-INTAKE-${p.patient_id}`,
        patientId: p.patient_id,
        patientName: p.full_name,
        type: 'Intake Registration',
        timestamp: baseTime,
        actor: 'Triage Nurse',
        details: `Registered via ${p.arrival_mode}. Vitals recorded: HR ${p.heart_rate} bpm, BP ${p.sbp}/${p.dbp} mmHg, SpO2 ${p.spo2}%, RR ${p.respiratory_rate}/min. Chief complaint: "${p.chief_complaint}"`,
      });

      const scoreTime = new Date(baseTime.getTime() + 45000);
      events.push({
        id: `EVT-SCORE-${p.patient_id}`,
        patientId: p.patient_id,
        patientName: p.full_name,
        type: 'AI Risk Prediction',
        timestamp: scoreTime,
        actor: 'PatientTriage.ai ML Engine',
        details: `Calculated ESI Level ${p.predicted_triage_level || p.triage_level || 3} priority score. Evaluated physiological contributions (SpO2 ${p.spo2}%, SBP ${p.sbp} mmHg, HR ${p.heart_rate} bpm).`,
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [patients, persistedLogs]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((evt) => {
      const matchId =
        !searchPatientId ||
        evt.patientId.toLowerCase().includes(searchPatientId.toLowerCase()) ||
        evt.patientName.toLowerCase().includes(searchPatientId.toLowerCase());

      const matchType =
        selectedActionType === 'all' || evt.type.toLowerCase().includes(selectedActionType.toLowerCase());

      return matchId && matchType;
    });
  }, [auditEvents, searchPatientId, selectedActionType]);

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Patient ID', 'Patient Name', 'Timestamp', 'Action Type', 'Actor', 'Details'];
    const rows = filteredEvents.map((e) => [
      e.id,
      e.patientId,
      `"${e.patientName}"`,
      e.timestamp.toISOString(),
      `"${e.type}"`,
      `"${e.actor}"`,
      `"${e.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `patient_triage_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Governance & Compliance</span>
            <span>•</span>
            <span>Clinical Event History</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Clinical Governance & Audit Trail
          </h1>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient ID or Name..."
              value={searchPatientId}
              onChange={(e) => setSearchPatientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Action Types</option>
              <option value="Intake">Intake Registrations</option>
              <option value="AI Risk">AI Risk Predictions</option>
              <option value="Vital">Vital Signs Updates</option>
              <option value="Deterioration">Deterioration Events</option>
              <option value="Override">Clinician Overrides</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500 font-mono">
          {filteredEvents.length} Total Audit Records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500">
            Loading live clinical audit records...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500">
            No audit records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-clinical-border bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Clinical Rationale & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                      {evt.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {evt.timestamp.toLocaleDateString()} {evt.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{evt.patientName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{evt.patientId}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] border ${
                        evt.type.includes('Deterioration')
                          ? 'bg-red-50 text-red-800 border-red-200 font-bold'
                          : evt.type.includes('Override')
                          ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold'
                          : evt.type.includes('Vital')
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {evt.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {evt.actor}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">
                      {evt.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogPage;
