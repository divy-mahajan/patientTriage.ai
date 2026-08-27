import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertTriangle,
  Bed,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  Eye,
  Activity,
  HeartPulse
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import MetricCard from '../components/common/MetricCard';
import SeverityBadge from '../components/common/SeverityBadge';
import VitalsPills from '../components/common/VitalsPills';
import PatientDrawer from '../components/common/PatientDrawer';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { capacity, patients, loading, refreshAll } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDrawerPatient, setSelectedDrawerPatient] = useState(null);

  // Derived KPI Metrics
  const totalBeds = capacity?.summary?.total_beds || 24;
  const availableBeds = capacity?.summary?.available_beds || 0;
  const waitingRoomCount = capacity?.waiting_room?.current_occupancy || 0;

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchQuery = !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.patient_id?.toLowerCase().includes(q) ||
        p.chief_complaint?.toLowerCase().includes(q);

      // Status filter
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [patients, searchQuery, statusFilter]);

  const criticalCount = useMemo(() => {
    return patients.filter(p => p.spo2 < 91 || p.heart_rate > 125 || p.sbp < 90 || p.gcs < 14).length;
  }, [patients]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Emergency Department Triage Command
          </h1>
          <p className="text-xs sm:text-sm text-clinical-text-secondary mt-0.5">
            Real-time patient intake queue, ML risk predictions, and bed unit allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/intake')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-clinical-primary-container text-white px-4 py-2 text-xs font-bold hover:bg-clinical-primary transition shadow-xs"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            New Patient Intake
          </button>
        </div>
      </div>

      {/* 5-Metric Bento KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Patients Logged"
          value={patients.length}
          subtitle="Total intake cohort"
          icon={Users}
          variant="default"
        />
        <MetricCard
          title="Lobby Queue"
          value={waitingRoomCount}
          subtitle="Waiting in ED waiting room"
          icon={Clock}
          variant={waitingRoomCount > 25 ? 'warning' : 'default'}
          trend="+3 last 30m"
        />
        <MetricCard
          title="High Acuity / Critical"
          value={criticalCount}
          subtitle="Unstable vitals / high risk"
          icon={HeartPulse}
          variant={criticalCount > 0 ? 'critical' : 'default'}
        />
        <MetricCard
          title="Beds Available"
          value={`${availableBeds} / ${totalBeds}`}
          subtitle={`${Math.round((availableBeds / Math.max(1, totalBeds)) * 100)}% capacity free`}
          icon={Bed}
          variant={availableBeds < 3 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Reassessments"
          value={Math.max(1, Math.floor(patients.length * 0.1))}
          subtitle="Target wait window check"
          icon={Activity}
          variant="default"
        />
      </div>

      {/* Triage Live Queue Section */}
      <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden">
        {/* Table Controls & Filter Bar */}
        <div className="border-b border-clinical-border bg-slate-50/80 p-4 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, ID, or complaint..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Patients</option>
                <option value="waiting">Waiting Triage</option>
                <option value="triaged">Triaged (Pending Bed)</option>
                <option value="assigned_bed">Assigned Bed</option>
                <option value="discharged">Discharged</option>
              </select>
            </div>

            <button
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Patient Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-clinical-border bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Patient / Demographics</th>
                <th className="py-3 px-4">Chief Complaint & Reported Symptoms</th>
                <th className="py-3 px-4">Live Vital Signs</th>
                <th className="py-3 px-4">Status / Acuity</th>
                <th className="py-3 px-4">Arrival Mode</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-sm">No patient records found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "New Patient Intake" or load a sample preset to start.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  // Acuity styling heuristic
                  const isHighAcuity = patient.spo2 < 92 || patient.heart_rate > 120 || patient.sbp < 90;

                  return (
                    <tr
                      key={patient.patient_id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isHighAcuity ? 'severity-strip-2 bg-orange-50/20' : 'severity-strip-4'
                      }`}
                    >
                      {/* Patient / Demographics */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div>
                            <span className="font-bold text-slate-900 block hover:text-blue-600 cursor-pointer" onClick={() => setSelectedDrawerPatient(patient)}>
                              {patient.full_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: {patient.patient_id} · {patient.age}y · {patient.gender}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Complaint & Symptoms */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-900 font-medium line-clamp-1">
                          "{patient.chief_complaint}"
                        </p>
                        {patient.symptoms && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5 font-sans">
                            {patient.symptoms}
                          </p>
                        )}
                      </td>

                      {/* Vitals */}
                      <td className="py-3 px-4">
                        <VitalsPills
                          heartRate={patient.heart_rate}
                          sbp={patient.sbp}
                          dbp={patient.dbp}
                          spo2={patient.spo2}
                          respiratoryRate={patient.respiratory_rate}
                          temperatureC={patient.temperature_c}
                          gcs={patient.gcs}
                          size="sm"
                        />
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          patient.status === 'assigned_bed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : patient.status === 'triaged'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {patient.status?.replace('_', ' ') || 'Waiting'}
                        </span>
                      </td>

                      {/* Arrival */}
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <span>{patient.arrival_mode}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/assessment/${encodeURIComponent(patient.patient_id)}`)}
                            className="inline-flex items-center gap-1 rounded bg-clinical-primary-container text-white px-2.5 py-1 text-xs font-bold hover:bg-clinical-primary transition shadow-2xs"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Triage</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDrawerPatient(patient)}
                            title="Quick View Details"
                            className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Drawer Slide-out */}
      <PatientDrawer
        patient={selectedDrawerPatient}
        isOpen={!!selectedDrawerPatient}
        onClose={() => setSelectedDrawerPatient(null)}
      />
    </div>
  );
};

export default DashboardPage;
