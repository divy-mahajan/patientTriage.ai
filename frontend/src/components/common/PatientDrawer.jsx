import React from 'react';
import { X, User, Clock, AlertTriangle, ShieldCheck, Stethoscope, Bed, Sparkles } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import VitalsPills from './VitalsPills';
import { useNavigate } from 'react-router-dom';

export const PatientDrawer = ({ patient, isOpen, onClose, onSelectForBed }) => {
  const navigate = useNavigate();

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-clinical-border flex flex-col">
          {/* Header */}
          <div className="border-b border-clinical-border bg-slate-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clinical-primary-container text-white font-bold">
                {patient.full_name?.split(',')[0]?.[0] || 'P'}
              </div>
              <div>
                <h2 className="text-base font-bold text-clinical-text-primary">
                  {patient.full_name}
                </h2>
                <p className="text-xs text-clinical-text-secondary font-mono">
                  ID: {patient.patient_id} · {patient.age}y · {patient.gender}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Status & Arrival */}
            <div className="flex items-center justify-between rounded-lg border border-clinical-border bg-slate-50/70 p-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Workflow Status
                </span>
                <span className="text-xs font-bold capitalize text-clinical-text-primary">
                  {patient.status?.replace('_', ' ') || 'Waiting'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Arrival Mode
                </span>
                <span className="text-xs font-semibold text-clinical-text-secondary">
                  {patient.arrival_mode}
                </span>
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1">
                Chief Complaint
              </label>
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm font-medium text-slate-900">
                "{patient.chief_complaint}"
              </div>
            </div>

            {/* Symptoms & Observations */}
            {(patient.symptoms || patient.clinician_observations) && (
              <div className="space-y-3">
                {patient.symptoms && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1">
                      Reported Symptoms
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {patient.symptoms.split(';').map((sym, i) => (
                        <span key={i} className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium">
                          {sym.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {patient.clinician_observations && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1">
                      Clinician Observations
                    </label>
                    <p className="text-xs text-slate-700 italic bg-amber-50/50 p-2.5 rounded border border-amber-100">
                      {patient.clinician_observations}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Vital Signs */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-2">
                Physiological Vitals
              </label>
              <VitalsPills
                heartRate={patient.heart_rate}
                sbp={patient.sbp}
                dbp={patient.dbp}
                spo2={patient.spo2}
                respiratoryRate={patient.respiratory_rate}
                temperatureC={patient.temperature_c}
                gcs={patient.gcs}
                size="md"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-clinical-border bg-slate-50 p-4 space-y-2">
            <button
              onClick={() => {
                onClose();
                navigate(`/assessment/${encodeURIComponent(patient.patient_id)}`);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-clinical-primary-container text-white py-2.5 text-xs font-bold hover:bg-clinical-primary transition shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open Triage Assessment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDrawer;
