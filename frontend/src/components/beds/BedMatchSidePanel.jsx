import React, { useState, useEffect } from 'react';
import { Sparkles, Bed, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, RefreshCw, X, Wrench } from 'lucide-react';
import { bedsApi } from '../../api/bedsApi';
import { useHospital } from '../../context/HospitalContext';
import SeverityBadge from '../common/SeverityBadge';

export const BedMatchSidePanel = ({
  patient,
  selectedBed,
  onBedAssigned,
  onClose
}) => {
  const { updateBedStatus, addNotification } = useHospital();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  // Status modify state for manual bed control
  const [manualStatus, setManualStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (patient) {
      fetchRecommendation();
    } else {
      setRecommendation(null);
    }
  }, [patient]);

  const fetchRecommendation = async () => {
    if (!patient) return;
    try {
      setLoading(true);
      setError(null);
      const res = await bedsApi.recommendBed({
        patient_id: patient.patient_id,
        predicted_triage_level: patient.predicted_triage_level || 3,
        is_high_risk: patient.is_high_risk || false,
        chief_complaint: patient.chief_complaint,
        symptoms: patient.symptoms || '',
        required_equipment: []
      });
      setRecommendation(res);
    } catch (err) {
      console.error('Failed to get bed recommendation:', err);
      setError(err.message || 'Failed to compute bed recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBed = async (bedToAssign) => {
    if (!patient || !bedToAssign) return;
    try {
      setAssigning(true);
      const res = await bedsApi.assignBed({
        patient_id: patient.patient_id,
        bed_id: bedToAssign.bed_id,
        unit_id: bedToAssign.unit_id
      });
      addNotification(
        'Bed Assigned Successfully',
        `${patient.full_name} routed to ${res.bed_label} (${res.unit_name})`,
        'success'
      );
      if (onBedAssigned) onBedAssigned(res);
    } catch (err) {
      addNotification('Bed Assignment Failed', err.message, 'critical');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedBed) return;
    try {
      setUpdatingStatus(true);
      await updateBedStatus(selectedBed.bed_id, newStatus);
      setManualStatus('');
    } catch (err) {
      console.error('Failed to update bed status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="rounded-xl border border-clinical-border bg-white shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-clinical-border bg-slate-50 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-clinical-primary-container" />
          <h3 className="text-sm font-bold text-clinical-text-primary">
            Smart Bed Match & Allocation
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Patient Selection Card */}
        {patient ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Target Patient
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {patient.full_name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ID: {patient.patient_id} · {patient.age}y
                </span>
              </div>
              <SeverityBadge level={patient.predicted_triage_level || 3} size="sm" />
            </div>
            <p className="text-xs text-slate-700 italic truncate">
              "{patient.chief_complaint}"
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            Select a waiting or triaged patient to compute real-time bed affinity matching.
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="py-8 text-center space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-clinical-primary-container mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              Evaluating live unit affinity and equipment matrix...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Recommendation Results */}
        {!loading && recommendation && recommendation.recommended_bed && (
          <div className="space-y-4">
            {/* Top Match Card */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1.5">
                Optimal Unit Match (Rank #1)
              </span>
              <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {recommendation.recommended_bed.bed_label}
                    </h4>
                    <span className="text-xs text-emerald-800 font-semibold">
                      {recommendation.recommended_bed.unit_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white font-mono">
                      {recommendation.recommended_bed.match_score} pts
                    </span>
                  </div>
                </div>

                {/* Reasons List */}
                <div className="space-y-1">
                  {recommendation.recommended_bed.suitability_reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={assigning}
                  onClick={() => handleAssignBed(recommendation.recommended_bed)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                >
                  <Bed className="h-4 w-4" />
                  {assigning ? 'Assigning...' : `Assign to ${recommendation.recommended_bed.bed_label}`}
                </button>
              </div>
            </div>

            {/* Rule Chain Explanations */}
            {recommendation.deterministic_rule_chain && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1">
                  Deterministic Decision Chain
                </span>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 font-mono text-[11px] text-slate-700">
                  {recommendation.deterministic_rule_chain.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold">→</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Beds */}
            {recommendation.alternative_beds && recommendation.alternative_beds.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1.5">
                  Alternative Available Beds
                </span>
                <div className="space-y-2">
                  {recommendation.alternative_beds.map((alt) => (
                    <div
                      key={alt.bed_id}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {alt.bed_label} · {alt.unit_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Score: {alt.match_score} pts
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAssignBed(alt)}
                        disabled={assigning}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Bed Quick Modifier */}
        {selectedBed && (
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-900">
                  Selected Bed: {selectedBed.bed_label || selectedBed.bed_id}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase font-mono text-slate-500">
                {selectedBed.status}
              </span>
            </div>

            <div className="text-xs text-slate-600">
              Update status for hospital capacity synchronization:
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('available')}
                className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 py-1.5 px-2 text-xs font-bold hover:bg-emerald-200 transition"
              >
                Mark Available
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('cleaning')}
                className="rounded-lg bg-amber-100 text-amber-800 border border-amber-300 py-1.5 px-2 text-xs font-bold hover:bg-amber-200 transition"
              >
                Mark Cleaning
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('reserved')}
                className="rounded-lg bg-blue-100 text-blue-800 border border-blue-300 py-1.5 px-2 text-xs font-bold hover:bg-blue-200 transition"
              >
                Reserve Bed
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus('unavailable')}
                className="rounded-lg bg-red-100 text-red-800 border border-red-300 py-1.5 px-2 text-xs font-bold hover:bg-red-200 transition"
              >
                Maintenance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BedMatchSidePanel;
