import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Stethoscope,
  UserCheck,
  UserPlus,
  Activity,
  Plus,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import DoctorShiftCard from '../components/doctors/Doctorshiftcard';
import CaseloadBarChart from '../components/doctors/Caseloadbarchart';
import DoctorCheckInModal from '../components/doctors/Doctorscheckinmodal';

export const DoctorsPage = () => {
  const location = useLocation();
  const { doctors, patients, fetchDoctors, addNotification, loading } = useHospital();

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [specialtyFilter, setSpecialtyFilter] = useState('all');

  // Smart Assignment tool
  const [targetPatient, setTargetPatient] = useState(
    location.state?.targetPatient || (patients.length > 0 ? patients[0] : null)
  );
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const specialties = Array.from(new Set(doctors.map(d => d.specialty))).filter(Boolean);

  const filteredDoctors = specialtyFilter === 'all'
    ? doctors
    : doctors.filter(d => d.specialty === specialtyFilter);

  const handleSmartAssign = async () => {
    if (!targetPatient) return;
    try {
      setAssigning(true);
      setAssignmentResult(null);

      const res = await doctorsApi.assignDoctor({
        patient_id: targetPatient.patient_id,
        predicted_triage_level: targetPatient.predicted_triage_level || 3,
        chief_complaint: targetPatient.chief_complaint,
        age: targetPatient.age
      });

      setAssignmentResult(res);
      addNotification(
        'Physician Assigned',
        `${targetPatient.full_name} assigned to ${res.doctor.name} (${res.doctor.specialty})`,
        'success'
      );
      await fetchDoctors();
    } catch (err) {
      console.error('Doctor assignment error:', err);
      addNotification('Assignment Failed', err.message, 'critical');
    } finally {
      setAssigning(false);
    }
  };

  const handleQuickAssignToDoctor = async (doc) => {
    if (!targetPatient) {
      addNotification('Select Patient', 'Please select a patient to assign first.', 'warning');
      return;
    }
    try {
      setAssigning(true);
      const res = await doctorsApi.assignDoctor({
        patient_id: targetPatient.patient_id,
        manual_doctor_id: doc.doctor_id
      });
      setAssignmentResult(res);
      addNotification(
        'Manual Handoff Completed',
        `Assigned ${targetPatient.full_name} to ${doc.name}`,
        'success'
      );
      await fetchDoctors();
    } catch (err) {
      addNotification('Handoff Failed', err.message, 'critical');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Physician Workstation & Caseload Management
          </h1>
          <p className="text-xs sm:text-sm text-clinical-text-secondary mt-0.5">
            Active physician roster, specialty routing, shift status check-in, and smart workload balancing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingDoctor(null);
            setShowCheckInModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-clinical-primary-container text-white px-4 py-2 text-xs font-bold hover:bg-clinical-primary transition shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          Physician Shift Check-In
        </button>
      </div>

      {/* Smart Doctor Assignment Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-clinical-primary-container" />
              <h3 className="text-sm font-bold text-slate-900">
                Automated Specialty & Caseload Matching Engine
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Deterministically routes patients to the best-matching available physician based on clinical presentation and active workload.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={targetPatient?.patient_id || ''}
              onChange={(e) => {
                const found = patients.find(p => p.patient_id === e.target.value);
                setTargetPatient(found || null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden"
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.full_name} ({p.patient_id})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={assigning || !targetPatient}
              onClick={handleSmartAssign}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2 text-xs font-bold hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
            >
              <Stethoscope className="h-4 w-4" />
              <span>{assigning ? 'Matching...' : 'Auto-Match & Assign Physician'}</span>
            </button>
          </div>
        </div>

        {/* Assignment Result Card if available */}
        {assignmentResult && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-950">
                  Handoff Completed: Assigned to {assignmentResult.doctor.name} ({assignmentResult.doctor.specialty})
                </span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  {assignmentResult.assignment_rationale} · Match Score: {assignmentResult.match_score} pts
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
              Assigned: {new Date(assignmentResult.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Workstation & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Doctor Shift Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-clinical-border pb-3 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Specialty:</span>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Specialties</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredDoctors.length} tracked physicians
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredDoctors.map((doc) => (
              <DoctorShiftCard
                key={doc.doctor_id}
                doctor={doc}
                isSelected={selectedDoctor?.doctor_id === doc.doctor_id}
                onSelect={() => {
                  setEditingDoctor(doc);
                  setShowCheckInModal(true);
                }}
                onQuickAssign={handleQuickAssignToDoctor}
              />
            ))}
          </div>
        </div>

        {/* Right Col: Caseload Balancing Chart */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-clinical-text-primary">
              Live Workload Balancing
            </h3>
            <CaseloadBarChart doctors={doctors} />
          </div>
        </div>
      </div>

      {/* Check-In Modal */}
      <DoctorCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        initialDoctor={editingDoctor}
      />
    </div>
  );
};

export default DoctorsPage;
