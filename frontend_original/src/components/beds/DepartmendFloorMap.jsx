import React from 'react';
import BedTile from './BedTile';
import { Building2, Layers, AlertTriangle } from 'lucide-react';

export const DepartmentFloorMap = ({
  units = [],
  selectedUnit = 'all',
  selectedBedId = null,
  recommendedBedId = null,
  onSelectBed
}) => {
  const filteredUnits = selectedUnit === 'all'
    ? units
    : units.filter(u => u.unit_id === selectedUnit);

  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-clinical-border bg-white p-12 text-center text-slate-500">
        <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
        <p className="font-semibold text-sm">No hospital unit capacity data loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filteredUnits.map((unit) => {
        const total = unit.total_beds || unit.beds?.length || 0;
        const available = unit.available_beds ?? unit.beds?.filter(b => b.status === 'available').length;
        const occupied = unit.occupied_beds ?? unit.beds?.filter(b => b.status === 'occupied').length;

        return (
          <div
            key={unit.unit_id}
            className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs"
          >
            {/* Unit Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-clinical-border pb-3 mb-4 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                  FL {unit.floor || 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-clinical-text-primary flex items-center gap-2">
                    <span>{unit.unit_name}</span>
                    <span className="font-mono text-[10px] text-slate-400 font-normal">
                      ({unit.unit_id})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-clinical-text-secondary mt-0.5">
                    <span className="font-semibold text-emerald-700">{available} Available</span>
                    <span>·</span>
                    <span className="text-slate-600">{occupied} Occupied</span>
                    <span>·</span>
                    <span className="text-slate-500">{total} Total</span>
                  </div>
                </div>
              </div>

              {/* Unit Capabilities */}
              {unit.default_capabilities && (
                <div className="hidden sm:flex flex-wrap gap-1.5 max-w-sm justify-end">
                  {unit.default_capabilities.slice(0, 3).map((cap, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 font-medium"
                    >
                      {cap.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bed Tiles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {unit.beds?.map((bed) => (
                <BedTile
                  key={bed.bed_id}
                  bed={bed}
                  unitName={unit.unit_name}
                  isSelected={selectedBedId === bed.bed_id}
                  isRecommended={recommendedBedId === bed.bed_id}
                  onClick={() => onSelectBed && onSelectBed(bed, unit)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DepartmentFloorMap;
