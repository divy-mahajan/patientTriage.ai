import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bed,
  Building2,
  Filter,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import DepartmentFloorMap from '../components/beds/DepartmentFloorMap';
import BedMatchSidePanel from '../components/beds/BedMatchSidePanel';

export const BedMapPage = () => {
  const location = useLocation();
  const { capacity, patients, refreshAll, loading } = useHospital();

  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedBed, setSelectedBed] = useState(null);
  const [targetPatient, setTargetPatient] = useState(
    location.state?.selectedPatient || (patients.length > 0 ? patients[0] : null)
  );

  useEffect(() => {
    if (location.state?.selectedPatient) {
      setTargetPatient(location.state.selectedPatient);
    }
  }, [location.state]);

  const units = capacity?.units || [];
  const summary = capacity?.summary || {};

  const handleSelectBed = (bed, unit) => {
    setSelectedBed({
      ...bed,
      unit_id: unit.unit_id,
      unit_name: unit.unit_name
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Bed Availability & Department Spatial Map
          </h1>
          <p className="text-xs sm:text-sm text-clinical-text-secondary mt-0.5">
            Real-time unit capacity visualization, capability routing, and automated bed affinity matching.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Patient to Route:</span>
          <select
            value={targetPatient?.patient_id || ''}
            onChange={(e) => {
              const found = patients.find(p => p.patient_id === e.target.value);
              setTargetPatient(found || null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-hidden"
          >
            <option value="">-- Select Patient --</option>
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.full_name} ({p.patient_id}) · ESI {p.predicted_triage_level || 3}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend & Filter Bar */}
      <div className="rounded-xl border border-clinical-border bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Legend:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Available ({summary.available_beds || 0})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 border border-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Occupied ({summary.occupied_beds || 0})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Cleaning ({summary.cleaning_beds || 0})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-800 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Reserved ({summary.reserved_beds || 0})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-red-800 border border-red-200">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Unavailable ({summary.unavailable_beds || 0})
          </span>
        </div>

        {/* Unit Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSelectedUnit('all')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
              selectedUnit === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Units
          </button>
          {units.map((u) => (
            <button
              key={u.unit_id}
              type="button"
              onClick={() => setSelectedUnit(u.unit_id)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                selectedUnit === u.unit_id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {u.unit_name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Spatial 2D Map & AI Match Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Floor Map */}
        <div className="lg:col-span-2 space-y-6">
          <DepartmentFloorMap
            units={units}
            selectedUnit={selectedUnit}
            selectedBedId={selectedBed?.bed_id}
            recommendedBedId={null}
            onSelectBed={handleSelectBed}
          />
        </div>

        {/* Right Col: AI Bed Recommendation Side Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <BedMatchSidePanel
              patient={targetPatient}
              selectedBed={selectedBed}
              onBedAssigned={() => {
                refreshAll();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BedMapPage;
