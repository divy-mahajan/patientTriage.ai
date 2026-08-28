import React, { useState, useEffect, useCallback } from 'react';
import {
  Bed,
  Building2,
  Activity,
  Droplets,
  Pill,
  AlertCircle,
  RefreshCw,
  User,
  HeartPulse,
  Stethoscope,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileEdit,
  X
} from 'lucide-react';
import { hospitalAPI, patientsAPI, bedsAPI, treatmentsAPI } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import ClinicalTooltip from '../components/ClinicalTooltip';

export function BedMapPage({ onSelectPatient, onNavigate }) {
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [capacityData, setCapacityData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedBed, setSelectedBed] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // New treatment form
  const [treatmentForm, setTreatmentForm] = useState({
    name: '',
    type: 'medication',
    dose: '',
    route: 'IV',
    frequency: 'Continuous',
    infusion_rate: '',
    starting_quantity: '',
    next_administration: '',
  });

  const fetchBedData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [capData, ptsData] = await Promise.all([
        hospitalAPI.getCapacity().catch(() => null),
        patientsAPI.listPatients().catch(() => ({ patients: [] })),
      ]);
      setCapacityData(capData);
      setPatients(ptsData.patients || []);

      // If a bed is currently selected in the modal, update its live state
      if (selectedBed && capData?.units) {
        for (const u of capData.units) {
          for (const b of u.beds) {
            if (b.bed_id === selectedBed.bed_id) {
              setSelectedBed({ ...b, unit_name: u.unit_name, unit_id: u.unit_id, floor: u.floor });
              break;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching bed capacity:', err);
      setError('Unable to load live bed availability. Please check the backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBed]);

  useEffect(() => {
    fetchBedData();
    const handleProfileSwapped = () => {
      fetchBedData();
    };
    window.addEventListener('hospital-profile-swapped', handleProfileSwapped);
    return () => window.removeEventListener('hospital-profile-swapped', handleProfileSwapped);
  }, []);

  const units = capacityData?.units || [];
  const patientMap = {};
  patients.forEach((p) => {
    patientMap[p.patient_id] = p;
  });

  const filteredUnits = units.filter((u) => {
    if (selectedUnit === 'all') return true;
    return u.unit_id === selectedUnit;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'occupied':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'cleaning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'reserved':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const summary = capacityData?.summary || {
    total_beds: 24,
    available_beds: 0,
    occupied_beds: 0,
    cleaning_beds: 0,
    reserved_beds: 0,
    unavailable_beds: 0,
  };

  // Open Bed Detail Modal
  const handleBedClick = (bed, unit) => {
    setSelectedBed({
      ...bed,
      unit_name: unit.unit_name,
      unit_id: unit.unit_id,
      floor: unit.floor,
    });
    setShowDetailModal(true);
  };

  // Release Bed / Discharge patient
  const handleReleaseBed = async (bedId, patientId) => {
    if (!confirm('Discharge / release patient from this bed? The bed will transition to Cleaning.')) {
      return;
    }
    setIsProcessing(true);
    try {
      await bedsAPI.releaseBed(bedId, patientId, 10, 'discharged');
      setShowDetailModal(false);
      await fetchBedData();
    } catch (err) {
      console.error('Error releasing bed:', err);
      alert('Failed to release bed: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete Sanitation / Cleaning
  const handleCompleteCleaning = async (bedId) => {
    setIsProcessing(true);
    try {
      await bedsAPI.completeCleaning(bedId);
      setShowDetailModal(false);
      await fetchBedData();
    } catch (err) {
      console.error('Error completing cleaning:', err);
      alert('Failed to complete cleaning: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Treatment to Patient
  const handleAddTreatmentSubmit = async (e) => {
    e.preventDefault();
    const pid = selectedBed?.assigned_patient_id || selectedBed?.current_patient_id;
    if (!pid || !treatmentForm.name.trim()) return;

    setIsProcessing(true);
    try {
      await treatmentsAPI.addTreatment(pid, {
        name: treatmentForm.name,
        type: treatmentForm.type,
        dose: treatmentForm.dose,
        route: treatmentForm.route,
        frequency: treatmentForm.frequency,
        status: 'ACTIVE',
        infusion_rate: treatmentForm.infusion_rate ? parseFloat(treatmentForm.infusion_rate) : null,
        starting_quantity: treatmentForm.starting_quantity ? parseFloat(treatmentForm.starting_quantity) : null,
        next_administration: treatmentForm.next_administration || null,
      });

      setShowAddTreatmentModal(false);
      setTreatmentForm({
        name: '',
        type: 'medication',
        dose: '',
        route: 'IV',
        frequency: 'Continuous',
        infusion_rate: '',
        starting_quantity: '',
        next_administration: '',
      });
      await fetchBedData();
    } catch (err) {
      console.error('Error adding treatment:', err);
      alert('Failed to add treatment: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigate to Assessment
  const handleOpenAssessment = (patientRecord) => {
    if (onSelectPatient && patientRecord) {
      setShowDetailModal(false);
      onSelectPatient(patientRecord);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Hospital Logistics</span>
            <span>•</span>
            <span>Live Bed Matrix & Unit Availability</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Bed Map & Unit Availability
          </h1>
        </div>

        {/* Live Bed Summary Counters from backend */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            {summary.available_beds} Available
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 shadow-2xs">
            {summary.occupied_beds} Occupied
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            {summary.cleaning_beds} Cleaning
          </span>
          {(summary.unavailable_beds > 0 || summary.reserved_beds > 0) && (
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
              {(summary.unavailable_beds || 0) + (summary.reserved_beds || 0)} Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4 text-xs font-semibold text-red-800">
          <div className="flex items-center gap-2">
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchBedData}
            className="px-3 py-1 bg-white border border-red-200 rounded font-bold hover:bg-red-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Unit Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedUnit('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedUnit === 'all'
              ? 'bg-clinical-primary-container text-white shadow-2xs'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Hospital Units ({units.length})
        </button>
        {units.map((u) => (
          <button
            key={u.unit_id}
            type="button"
            onClick={() => setSelectedUnit(u.unit_id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedUnit === u.unit_id
                ? 'bg-clinical-primary-container text-white shadow-2xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {u.unit_name || u.name}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading && !capacityData ? (
        <div className="p-12 bg-white border border-clinical-border rounded-xl text-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 rounded-full border-2 border-clinical-primary-container border-t-transparent animate-spin mx-auto"></div>
          <div className="text-xs font-semibold text-slate-500">Loading live unit allocations...</div>
        </div>
      ) : (
        /* Unit Sections */
        <div className="space-y-6">
          {filteredUnits.map((u) => {
            const availCount = u.beds.filter((b) => b.status === 'available').length;
            const occCount = u.beds.filter((b) => b.status === 'occupied').length;
            const cleanCount = u.beds.filter((b) => b.status === 'cleaning').length;
            const unavailCount = u.beds.filter((b) => b.status === 'unavailable' || b.status === 'reserved').length;
            const totalBeds = u.beds.length || u.total_beds || 1;
            const occPercent = Math.round((occCount / totalBeds) * 100);

            return (
              <div key={u.unit_id} className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
                {/* Unit Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-clinical-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{u.unit_name || u.name}</h2>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Floor {u.floor}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {totalBeds} Total Beds · {availCount} Available · {occCount} Occupied · {cleanCount} Cleaning {unavailCount > 0 ? `· ${unavailCount} Unavailable` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {occPercent}% Occupied
                    </span>
                    <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div className="bg-red-500 h-full" style={{ width: `${occPercent}%` }}></div>
                      <div className="bg-emerald-500 h-full" style={{ width: `${Math.round((availCount / totalBeds) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Beds Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {u.beds.map((b) => {
                    const pid = b.assigned_patient_id || b.current_patient_id;
                    const matchedPt = patientMap[pid];
                    const pName = b.assigned_patient_name || matchedPt?.full_name || pid;
                    const pLevel = b.assigned_patient_triage_level || matchedPt?.predicted_triage_level || matchedPt?.triage_level || 3;
                    const pComplaint = b.assigned_patient_complaint || matchedPt?.chief_complaint;
                    const docName = b.assigned_doctor_name || (b.assigned_doctor_id ? `Physician (${b.assigned_doctor_id})` : null);
                    const treatments = b.treatments || [];

                    return (
                      <div
                        key={b.bed_id}
                        onClick={() => handleBedClick(b, u)}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2.5 hover:border-slate-400 transition-all flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          {/* Bed Label & Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900 font-mono">
                              BED {b.bed_label || b.label || b.bed_id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(b.status)}`}>
                              {b.status}
                            </span>
                          </div>

                          {/* Patient / Allocation Details */}
                          <div className="mt-2 space-y-1 text-xs">
                            {b.status === 'occupied' && pid ? (
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-1">
                                  <div className="font-bold text-slate-900 truncate max-w-[130px]" title={pName}>
                                    {pName}
                                  </div>
                                  <SeverityBadge level={pLevel} size="sm" />
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {pid}
                                </div>

                                {pComplaint && (
                                  <div className="text-[11px] text-slate-600 truncate font-medium" title={pComplaint}>
                                    {pComplaint}
                                  </div>
                                )}

                                {docName && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    MD: <span className="text-slate-800 font-semibold">{docName}</span>
                                  </div>
                                )}
                              </div>
                            ) : b.status === 'cleaning' ? (
                              <div className="text-amber-800 font-medium text-[11px] pt-1">
                                <div>Cleaning in progress</div>
                                <div className="text-[10px] text-amber-600 font-mono mt-0.5">
                                  {b.cleaning_minutes_remaining || 10}m remaining
                                </div>
                              </div>
                            ) : b.status === 'available' ? (
                              <div className="text-emerald-700 font-medium text-[11px] pt-1">
                                Ready for intake
                              </div>
                            ) : (
                              <div className="text-slate-500 font-medium text-[11px] pt-1">
                                Unavailable: {b.notes || 'Maintenance'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Active Treatments & Equipment */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {b.status === 'occupied' && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Active Treatments
                              </div>
                              {treatments.length > 0 ? (
                                <div className="space-y-1">
                                  {treatments.slice(0, 2).map((t, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[10px] text-slate-700">
                                      <span className="font-medium truncate max-w-[110px]">{t.name}</span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                          t.is_replacement_required
                                            ? 'bg-red-50 text-red-800 border-red-200'
                                            : t.is_low
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {t.remaining_quantity !== null && t.remaining_quantity !== undefined
                                          ? `${t.remaining_quantity} ${t.quantity_unit || 'mL'}`
                                          : t.status}
                                      </span>
                                    </div>
                                  ))}
                                  {treatments.length > 2 && (
                                    <div className="text-[9px] text-slate-400 font-semibold">
                                      +{treatments.length - 2} more treatments
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">
                                  No active treatments recorded.
                                </div>
                              )}
                            </div>
                          )}

                          {/* Equipment Tags */}
                          {b.equipment && b.equipment.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {b.equipment.slice(0, 3).map((eq, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium"
                                >
                                  {eq.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bed Detail & Patient Modal */}
      {showDetailModal && selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-clinical-border rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-5 animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 font-mono">
                  BED {selectedBed.bed_label || selectedBed.label || selectedBed.bed_id}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedBed.unit_name} (Floor {selectedBed.floor})
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(selectedBed.status)}`}>
                  {selectedBed.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* If Bed is Occupied: Show Full Integrated Patient & Treatment Info */}
            {selectedBed.status === 'occupied' ? (
              <div className="space-y-4 text-xs">
                {/* 1. Patient Information */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Patient Information
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="text-slate-500 text-[11px]">Full Name</div>
                      <div className="font-bold text-slate-900 text-sm">
                        {selectedBed.assigned_patient_name || selectedBed.assigned_patient_id}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Patient ID</div>
                      <div className="font-mono font-bold text-slate-800">
                        {selectedBed.assigned_patient_id || selectedBed.current_patient_id}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Age / Sex</div>
                      <div className="font-semibold text-slate-900">
                        {selectedBed.assigned_patient_age ?? '--'} yrs / {selectedBed.assigned_patient_gender ?? '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[11px]">Arrival Mode</div>
                      <div className="font-semibold text-slate-900">
                        {selectedBed.assigned_patient_arrival_mode || 'Walk-in'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-slate-500 text-[11px]">Chief Complaint</div>
                    <div className="font-medium text-slate-800 mt-0.5">
                      "{selectedBed.assigned_patient_complaint || 'No complaint recorded.'}"
                    </div>
                  </div>
                </div>

                {/* 2. Triage & Care Team */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Triage Acuity
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <SeverityBadge
                        level={selectedBed.assigned_patient_triage_level || 3}
                        size="md"
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          {selectedBed.assigned_patient_triage_name || 'Urgent'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Risk: {Math.round(selectedBed.assigned_patient_risk_score || 50)} / 100
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Care Team & Location
                    </div>
                    <div className="font-bold text-slate-900 pt-1">
                      {selectedBed.assigned_doctor_name || 'Attending Physician Assigned'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {selectedBed.unit_name} · Floor {selectedBed.floor}
                    </div>
                  </div>
                </div>

                {/* 3. Live Vital Signs */}
                {selectedBed.assigned_patient_vitals && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Physiological Vitals
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">SpO2</div>
                        <div className="font-bold text-slate-900 font-mono">{selectedBed.assigned_patient_vitals.spo2}%</div>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">HR</div>
                        <div className="font-bold text-slate-900 font-mono">{selectedBed.assigned_patient_vitals.heart_rate} bpm</div>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">BP</div>
                        <div className="font-bold text-slate-900 font-mono">{selectedBed.assigned_patient_vitals.sbp}/{selectedBed.assigned_patient_vitals.dbp}</div>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">RR</div>
                        <div className="font-bold text-slate-900 font-mono">{selectedBed.assigned_patient_vitals.respiratory_rate}/m</div>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Temp</div>
                        <div className="font-bold text-slate-900 font-mono">{selectedBed.assigned_patient_vitals.temperature_c}°C</div>
                      </div>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">GCS</div>
                        <div className="font-bold text-slate-900 font-mono">{selectedBed.assigned_patient_vitals.gcs} / 15</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Active Treatments Table */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Active Treatments & Prescriptions
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddTreatmentModal(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-clinical-primary-container hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Order Treatment</span>
                    </button>
                  </div>

                  {(selectedBed.treatments || []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                            <th className="py-2 px-3">Treatment / Drug</th>
                            <th className="py-2 px-3">Dose & Route</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Remaining Volume / Schedule</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedBed.treatments.map((t, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-900">{t.name}</td>
                              <td className="py-2 px-3 text-slate-600">{t.dose} ({t.route || 'IV'})</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                    t.is_replacement_required
                                      ? 'bg-red-50 text-red-800 border-red-200'
                                      : t.is_low
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">
                                {t.remaining_quantity !== null && t.remaining_quantity !== undefined ? (
                                  <span>{t.remaining_quantity} {t.quantity_unit || 'mL'}</span>
                                ) : t.next_administration ? (
                                  <span>Next: {t.next_administration}</span>
                                ) : (
                                  <span>Active</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-slate-500 py-2 text-center text-xs italic">
                      No active treatments recorded for this patient.
                    </div>
                  )}
                </div>
              </div>
            ) : selectedBed.status === 'cleaning' ? (
              <div className="p-6 text-center space-y-3 bg-amber-50/40 rounded-xl border border-amber-200 text-xs">
                <div className="text-amber-900 font-bold text-sm">Bed is currently undergoing sanitization</div>
                <p className="text-slate-600 max-w-sm mx-auto">
                  Standard hospital turnover cleaning protocol active. Estimated turn-around time remaining: {selectedBed.cleaning_minutes_remaining || 10} minutes.
                </p>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleCompleteCleaning(selectedBed.bed_id)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {isProcessing ? 'Updating...' : 'Mark Cleaning Complete & Set Available'}
                </button>
              </div>
            ) : (
              <div className="p-6 text-center space-y-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="text-slate-900 font-bold text-sm">Bed is Available & Ready for Intake</div>
                <div className="text-slate-500">
                  Equipped with: {(selectedBed.equipment || []).join(', ') || 'Standard Bed Equipment'}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-clinical-border">
              <div>
                {selectedBed.status === 'occupied' && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReleaseBed(selectedBed.bed_id, selectedBed.assigned_patient_id || selectedBed.current_patient_id)}
                    className="px-3.5 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    {isProcessing ? 'Releasing...' : 'Release Bed / Discharge Patient'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedBed.status === 'occupied' && (
                  <button
                    type="button"
                    onClick={() => {
                      const pid = selectedBed.assigned_patient_id || selectedBed.current_patient_id;
                      const pt = patientMap[pid] || {
                        patient_id: pid,
                        full_name: selectedBed.assigned_patient_name,
                        age: selectedBed.assigned_patient_age,
                        gender: selectedBed.assigned_patient_gender,
                        chief_complaint: selectedBed.assigned_patient_complaint,
                        predicted_triage_level: selectedBed.assigned_patient_triage_level,
                      };
                      handleOpenAssessment(pt);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    Open Assessment
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Treatment Sub-Modal */}
      {showAddTreatmentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="font-bold text-sm text-slate-900">Order Treatment / Medication</h3>
              <button
                type="button"
                onClick={() => setShowAddTreatmentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTreatmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Treatment / Drug Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Normal Saline, Ceftriaxone, Morphine"
                  value={treatmentForm.name}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Type</label>
                  <select
                    value={treatmentForm.type}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, type: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-hidden"
                  >
                    <option value="infusion">IV Infusion / Fluid</option>
                    <option value="medication">Medication</option>
                    <option value="respiratory">Respiratory / Oxygen</option>
                    <option value="oral">Oral Therapy</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Dose / Concentration *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100 mL/hr, 1 g IV"
                    value={treatmentForm.dose}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, dose: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Starting Volume (mL)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={treatmentForm.starting_quantity}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, starting_quantity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Infusion Rate (mL/hr)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={treatmentForm.infusion_rate}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, infusion_rate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Next Administration / Schedule</label>
                <input
                  type="text"
                  placeholder="e.g. Continuous, Q8H (Next: 20:00)"
                  value={treatmentForm.next_administration}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, next_administration: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddTreatmentModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Save Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BedMapPage;
