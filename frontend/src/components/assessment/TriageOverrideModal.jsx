import React, { useState } from 'react';
import Modal from '../common/Modal';
import SeverityBadge from '../common/SeverityBadge';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

const ESI_LEVELS = [
  { level: 1, name: 'Resuscitation', desc: 'Immediate life threat, hemodynamic collapse, arrest' },
  { level: 2, name: 'Emergent', desc: 'High-risk situation, confusion/lethargy, severe pain, unstable vitals' },
  { level: 3, name: 'Urgent', desc: 'Stable vitals, multiple diagnostic/treatment resources anticipated' },
  { level: 4, name: 'Less Urgent', desc: 'Stable vitals, single diagnostic resource anticipated' },
  { level: 5, name: 'Non-Urgent', desc: 'Stable vitals, zero resources anticipated (fast-track)' }
];

export const TriageOverrideModal = ({
  isOpen,
  onClose,
  currentPredictedLevel = 2,
  onConfirmOverride,
  patientName = 'Patient'
}) => {
  const [targetLevel, setTargetLevel] = useState(currentPredictedLevel === 2 ? 1 : 2);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rationale.trim()) {
      setError('A clinical rationale is mandatory for medico-legal auditing when overriding AI triage.');
      return;
    }
    setError('');
    onConfirmOverride({
      targetLevel: Number(targetLevel),
      rationale: rationale.trim()
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinician Triage Acuity Override"
      maxWidth="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-xs"
          >
            Confirm Clinical Override
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current vs Override notice */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950">
            <span className="font-bold">Clinician-in-the-Loop Governance: </span>
            You are overriding the machine learning recommendation for <span className="font-bold">{patientName}</span>. This action and your entered rationale will be permanently recorded in the immutable audit log.
          </div>
        </div>

        {/* Acuity Level Selection */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-2">
            Select New Acuity Level (ESI 1–5)
          </label>
          <div className="space-y-2">
            {ESI_LEVELS.map((item) => (
              <label
                key={item.level}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                  targetLevel === item.level
                    ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="overrideLevel"
                    value={item.level}
                    checked={targetLevel === item.level}
                    onChange={() => setTargetLevel(item.level)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">Level {item.level} — {item.name}</span>
                      {item.level === currentPredictedLevel && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${targetLevel === item.level ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          (AI Recommended)
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${targetLevel === item.level ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.desc}
                    </p>
                  </div>
                </div>
                <SeverityBadge level={item.level} showName={false} size="sm" />
              </label>
            ))}
          </div>
        </div>

        {/* Clinical Rationale Textarea */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-clinical-text-secondary block mb-1">
            Required Clinical Rationale <span className="text-red-600">*</span>
          </label>
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => {
              setRationale(e.target.value);
              if (error) setError('');
            }}
            placeholder="Document clinical justification (e.g., refractory pain, worsening respiratory mechanics, high-risk cardiac comorbidities, toxic appearance)..."
            className={`w-full rounded-lg border p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
              error ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
            }`}
          />
          {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </form>
    </Modal>
  );
};

export default TriageOverrideModal;
