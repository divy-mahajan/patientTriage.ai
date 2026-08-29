import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bed,
  Building2,
  Filter,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  User,
  Stethoscope,
  Pill,
  Plus,
  ArrowRight,
  LogOut,
  Sparkle
} from 'lucide-react';
import { hospitalApi } from '../api/hospitalApi';
import { bedsApi } from '../api/bedsApi';
import { patientsApi } from '../api/patientsApi';
import { treatmentsApi } from '../api/treatmentsApi';
import SeverityBadge from '../components/common/SeverityBadge';
import VitalsPills from '../components/common/VitalsPills';

export const BedMapPage = () => {
  const navigate = useNavigate();

  const [capacity, setCapacity] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBed, setSelectedBed] = useState(null);
  const [bedTreatments, setBedTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({
    name: '',
    type: 'medication',
    dose: '1000 mL',
    route: 'IV',
    frequency: 'Continuous',
    infusion_rate: '125 mL/hr',
    starting_quantity: 1000,
  });

  const fetchBedData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [capRes, ptsRes] = await Promise.all([
        hospitalApi.getCapacity().catch(() => null),
        patientsApi.listPatients({ limit: 100 }).catch(() => ({ patients: [] })),
      ]);
      setCapacity(capRes);
      setPatients(ptsRes.patients || []);
    } catch (err) {
      console.error('Error fetching bed map:', err);
      setError('Unable to load real-time bed inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBedData();
    const interval = setInterval(fetchBedData, 15000);
    return () => clearInterval(interval);
  }, [fetchBedData]);

  // Load treatments when selecting a bed
  const handleSelectBed = async (bed, unit) => {
    const fullBed = { ...bed, unit_name: unit.unit_name, unit_id: unit.unit_id };
    setSelectedBed(fullBed);
    if (bed.patient_id) {
      try {
        const treatRes = await treatmentsApi.getPatientTreatments(bed.patient_id);
        setBedTreatments(treatRes.treatments || []);
      } catch {
        setBedTreatments([]);
      }
    } else {
      setBedTreatments([]);
    }
  };

  const handleCompleteCleaning = async (bedId) => {
    setIsSubmitting(true);
    try {
      await bedsApi.completeCleaning(bedId);
      if (selectedBed?.bed_id === bedId) {
        setSelectedBed(null);
      }
      await fetchBedData();
    } catch (err) {
      alert('Error completing cleaning: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseBed = async (bedId, patientId) => {
    if (!confirm('Are you sure you want to release this bed and transition to cleaning?')) return;
    setIsSubmitting(true);
    try {
      await bedsApi.releaseBed(bedId, patientId, 10, 'discharged');
      if (selectedBed?.bed_id === bedId) {
        setSelectedBed(null);
      }
      await fetchBedData();
    } catch (err) {
      alert('Error releasing bed: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTreatment = async (e) => {
    e.preventDefault();
    if (!selectedBed?.patient_id || !treatmentForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      await treatmentsApi.addTreatment(selectedBed.patient_id, {
        name: treatmentForm.name,
        type: treatmentForm.type,
        dose: treatmentForm.dose,
        route: treatmentForm.route,
        frequency: treatmentForm.frequency,
        infusion_rate: treatmentForm.infusion_rate,
        starting_quantity: Number(treatmentForm.starting_quantity) || 1000,
        remaining_quantity: Number(treatmentForm.starting_quantity) || 1000,
        unit: 'mL',
        status: 'active',
        ordered_by: 'Attending Clinician',
      });
      setShowAddTreatmentModal(false);
      const treatRes = await treatmentsApi.getPatientTreatments(selectedBed.patient_id);
      setBedTreatments(treatRes.treatments || []);
      await fetchBedData();
    } catch (err) {
      alert('Error adding treatment: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const units = capacity?.units || [];
  const summary = capacity?.summary || {
    total_beds: 24,
    available_beds: 0,
    occupied_beds: 0,
    cleaning_beds: 0,
    reserved_beds: 0,
    unavailable_beds: 0,
  };

  // Filter beds
  const displayedUnits = useMemo(() => {
    return units
      .filter((u) => selectedUnitId === 'all' || u.unit_id === selectedUnitId)
      .map((u) => ({
        ...u,
        beds: (u.beds || []).filter(
          (b) => statusFilter === 'all' || b.status === statusFilter
        ),
      }));
  }, [units, selectedUnitId, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return { label: 'Available', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dot-emerald-500' };
      case 'occupied':
        return { label: 'Occupied', color: 'bg-slate-100 text-slate-800 border-slate-300 dot-slate-600' };
      case 'cleaning':
        return { label: 'Cleaning', color: 'bg-amber-50 text-amber-800 border-amber-200 dot-amber-500' };
      case 'reserved':
        return { label: 'Reserved', color: 'bg-blue-50 text-blue-800 border-blue-200 dot-blue-500' };
      default:
        return { label: 'Unavailable', color: 'bg-red-50 text-red-800 border-red-200 dot-red-500' };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Hospital Resource Allocation</span>
            <span>•</span>
            <span>Spatial Bed Matrix</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Bed Map & Unit Availability
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBedData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            ← Triage Queue
          </button>
        </div>
      </div>

      {/* Summary KPI Counters & Legend Bar */}
      <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            All Beds ({summary.total_beds})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('available')}
            className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
              statusFilter === 'available' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            ● Available ({summary.available_beds})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('occupied')}
            className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
              statusFilter === 'occupied' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            ● Occupied ({summary.occupied_beds})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('cleaning')}
            className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
              statusFilter === 'cleaning' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            ● Cleaning ({summary.cleaning_beds})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('reserved')}
            className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
              statusFilter === 'reserved' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            ● Reserved ({summary.reserved_beds})
          </button>
        </div>

        {/* Unit Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Unit:</span>
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 focus:outline-hidden"
          >
            <option value="all">All Department Units</option>
            {units.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                {u.unit_name} ({u.beds?.filter(b => b.status === 'available').length || 0} avail)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spatial Unit Floor Map & Bed Cards */}
      <div className="space-y-6">
        {displayedUnits.map((unit) => {
          const availCount = (unit.beds || []).filter(b => b.status === 'available').length;
          const totalCount = (unit.beds || []).length;

          return (
            <div key={unit.unit_id} className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs space-y-4">
              {/* Unit Header */}
              <div className="flex items-center justify-between border-b border-clinical-border pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">{unit.unit_name}</h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Floor {unit.floor || 1}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700">
                  <span className={availCount > 0 ? 'text-emerald-700' : 'text-red-600'}>
                    {availCount} Available
                  </span>{' '}
                  <span className="text-slate-400 font-normal">/ {totalCount} Total</span>
                </div>
              </div>

              {/* Bed Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {unit.beds.map((bed) => {
                  const badge = getStatusBadge(bed.status);
                  const isSelected = selectedBed?.bed_id === bed.bed_id;

                  return (
                    <div
                      key={bed.bed_id}
                      onClick={() => handleSelectBed(bed, unit)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Bed Label & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {bed.bed_label || bed.bed_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Equipment Tags */}
                      {bed.equipment && bed.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {bed.equipment.slice(0, 2).map((eq, i) => (
                            <span key={i} className="text-[9px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {eq}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bed Content based on status */}
                      {bed.status === 'occupied' && (
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate">
                              {bed.patient_name || 'Patient'}
                            </span>
                            {bed.triage_level && (
                              <SeverityBadge level={bed.triage_level} size="sm" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {bed.patient_id}
                          </div>
                          {bed.active_treatments && bed.active_treatments.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-purple-700 font-semibold pt-1">
                              <Pill className="h-3 w-3" />
                              <span>{bed.active_treatments.length} Active Rx</span>
                            </div>
                          )}
                        </div>
                      )}

                      {bed.status === 'cleaning' && (
                        <div className="pt-2 border-t border-amber-200/60 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1 text-amber-800 font-bold text-[11px]">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Terminal Disinfection</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteCleaning(bed.bed_id);
                            }}
                            className="w-full py-1 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded transition cursor-pointer"
                          >
                            Complete Cleaning
                          </button>
                        </div>
                      )}

                      {bed.status === 'available' && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold">
                          Ready for Patient Intake
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed & Patient Interactive Detail Modal */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Bed {selectedBed.bed_label || selectedBed.bed_id} Detail
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {selectedBed.unit_name} (Floor {selectedBed.floor || 1})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status & Equipment */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Status:</span>
                <span className="font-extrabold uppercase text-slate-900">{selectedBed.status}</span>
              </div>
              {selectedBed.equipment && (
                <div className="text-[11px] text-slate-600">
                  Equipment: {selectedBed.equipment.join(', ')}
                </div>
              )}
            </div>

            {/* Occupying Patient Details */}
            {selectedBed.patient_id ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{selectedBed.patient_name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{selectedBed.patient_id}</div>
                  </div>
                  {selectedBed.triage_level && (
                    <SeverityBadge level={selectedBed.triage_level} size="md" />
                  )}
                </div>

                {selectedBed.chief_complaint && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Chief Complaint:</span>
                    <p className="italic text-slate-800">"{selectedBed.chief_complaint}"</p>
                  </div>
                )}

                {/* Active Treatments */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Active Treatments & Infusions ({bedTreatments.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddTreatmentModal(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Add Prescription
                    </button>
                  </div>

                  {bedTreatments.length > 0 ? (
                    <div className="space-y-1.5">
                      {bedTreatments.map((t, i) => (
                        <div key={i} className="p-2 bg-white border border-slate-200 rounded text-xs flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {t.dose} · {t.route} · {t.frequency} {t.infusion_rate ? `(${t.infusion_rate})` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {t.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">No active treatments logged for this patient.</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/assessment/${encodeURIComponent(selectedBed.patient_id)}`);
                      setSelectedBed(null);
                    }}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs text-center cursor-pointer"
                  >
                    Open Triage Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReleaseBed(selectedBed.bed_id, selectedBed.patient_id)}
                    className="px-4 py-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs transition cursor-pointer"
                  >
                    Discharge / Release Bed
                  </button>
                </div>
              </div>
            ) : selectedBed.status === 'cleaning' ? (
              <div className="space-y-3 text-xs">
                <p className="text-amber-800 font-medium">This bed is currently undergoing terminal cleaning.</p>
                <button
                  type="button"
                  onClick={() => handleCompleteCleaning(selectedBed.bed_id)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Mark Cleaning Complete
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-600">
                This bed is available for new patient assignment. Use the Triage Assessment page to route matched patients.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Treatment Modal */}
      {showAddTreatmentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-clinical-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-clinical-border pb-2">
              <h4 className="font-bold text-slate-900 text-sm">Add Active Treatment / Prescription</h4>
              <button
                type="button"
                onClick={() => setShowAddTreatmentModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTreatment} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase">Medication / Fluid Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Normal Saline 0.9%, Nitroglycerin IV"
                  value={treatmentForm.name}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Dose / Volume</label>
                  <input
                    type="text"
                    value={treatmentForm.dose}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, dose: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Route</label>
                  <select
                    value={treatmentForm.route}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, route: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="IV">IV Infusion</option>
                    <option value="Oral">Oral (PO)</option>
                    <option value="SubQ">Subcutaneous</option>
                    <option value="Inhalation">Inhalation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Infusion Rate</label>
                  <input
                    type="text"
                    value={treatmentForm.infusion_rate}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, infusion_rate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Total Vol (mL)</label>
                  <input
                    type="number"
                    value={treatmentForm.starting_quantity}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, starting_quantity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddTreatmentModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Treatment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedMapPage;
