import React, { useState } from 'react';
import MedicalNetworkBackground from '../components/MedicalNetworkBackground';
import { authAPI } from '../services/api';

export function LoginPage({ onLoginSuccess }) {
  const [clinicianId, setClinicianId] = useState('DOC-001');
  const [password, setPassword] = useState('triage2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await authAPI.login(clinicianId.trim(), password);
      localStorage.setItem('pt_token', response.access_token);
      localStorage.setItem('pt_clinician', JSON.stringify(response.clinician));
      onLoginSuccess(response.clinician);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify Clinician ID and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick prototype helper accounts
  const demoAccounts = [
    { id: 'DOC-001', pass: 'triage2026', label: 'Dr. Jenkins (Triage)' },
    { id: 'DOC-002', pass: 'cardio2026', label: 'Dr. Vance (Cardiology)' },
    { id: 'DOC-003', pass: 'trauma2026', label: 'Dr. Rostova (Trauma)' },
    { id: 'NURSE-001', pass: 'nurse2026', label: 'Nurse Reynolds (Triage)' },
  ];

  const handleSelectDemo = (acc) => {
    setClinicianId(acc.id);
    setPassword(acc.pass);
    setErrorMessage('');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
      {/* Subtle animated medical data network */}
      <MedicalNetworkBackground />

      {/* Clinical Glass Login Card */}
      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-container text-white shadow-md mb-2">
            <span className="material-symbols-outlined text-2xl">local_hospital</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">PatientTriage.ai</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-container">
            Clinical Operations
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50/90 border border-red-200 text-xs font-semibold text-severity-1 flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Clinician ID
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-lg">
                badge
              </span>
              <input
                type="text"
                value={clinicianId}
                onChange={(e) => setClinicianId(e.target.value)}
                placeholder="e.g. DOC-001"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white/70 border border-border rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary text-lg">
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-white/70 border border-border rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-container hover:bg-primary text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-75"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Prototype Account Quick Switcher */}
        <div className="pt-4 border-t border-border/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-secondary text-center mb-2.5">
            Quick Select Seed Clinician
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {demoAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  clinicianId === acc.id
                    ? 'border-primary-container bg-blue-50/80 font-bold text-primary'
                    : 'border-border/70 bg-white/50 hover:bg-white text-text-secondary'
                }`}
              >
                <div className="text-[11px] font-semibold truncate">{acc.label}</div>
                <div className="text-[10px] font-mono text-text-secondary opacity-80">{acc.id}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
