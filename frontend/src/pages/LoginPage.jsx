import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Lock,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Stethoscope
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { authApi } from '../api/authApi';

const SEED_CLINICIANS = [
  {
    id: 'DOC-001',
    name: 'Dr. Sarah Jenkins, MD',
    role: 'Attending Triage Officer',
    department: 'Emergency Department',
    password: 'triage2026',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    badge: 'Triage Lead'
  },
  {
    id: 'DOC-002',
    name: 'Dr. Marcus Vance, MD',
    role: 'Cardiology Attending',
    department: 'Cardiology Wing',
    password: 'cardio2026',
    avatar: 'https://images.unsplash.com/photo-1594824813588-662f551b9b18?w=150&auto=format&fit=crop&q=80',
    badge: 'Cardiology'
  },
  {
    id: 'DOC-003',
    name: 'Dr. Elena Rostova, MD',
    role: 'Trauma Surgeon',
    department: 'Trauma Bay / Resus',
    password: 'trauma2026',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    badge: 'Trauma Surgery'
  },
  {
    id: 'NURSE-001',
    name: 'Nurse J. Reynolds, RN',
    role: 'Triage Assessment Specialist',
    department: 'Emergency Intake',
    password: 'nurse2026',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    badge: 'Rapid Intake'
  }
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { capacity, login: contextLogin } = useHospital();

  const [clinicianId, setClinicianId] = useState('DOC-001');
  const [password, setPassword] = useState('triage2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleQuickSelect = (clinician) => {
    setClinicianId(clinician.id);
    setPassword(clinician.password);
    setErrorMessage(null);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (contextLogin) {
        await contextLogin(clinicianId, password);
      } else {
        const res = await authApi.login(clinicianId, password);
        if (res?.access_token) {
          localStorage.setItem('pt_token', res.access_token);
        }
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failure:', err);
      // Fallback: match persona locally if offline
      const matched = SEED_CLINICIANS.find(c => c.id.toUpperCase() === clinicianId.toUpperCase());
      if (matched && password === matched.password) {
        localStorage.setItem('pt_user', JSON.stringify(matched));
        navigate('/dashboard');
      } else {
        setErrorMessage(err.message || 'Invalid Clinician ID or credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md mb-3">
          <Activity className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          PatientTriage<span className="text-blue-600">.ai</span>
        </h1>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
          Clinical Decision Support & ED Workstation Login
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Hospital Profile Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Clinical Facility
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {capacity?.name || "St. Mary's General Hospital"}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Online · {capacity?.summary?.available_beds ?? 8} Beds Available
            </span>
          </div>

          {/* Quick Select 1-Click Personas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Select Clinician Persona (Quick Sign-In)
              </span>
              <span className="text-[10px] text-slate-400">1-Click Prototype Access</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEED_CLINICIANS.map((c) => {
                const isSelected = clinicianId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleQuickSelect(c)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="h-9 w-9 rounded-full object-cover border border-slate-300 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{c.name}</span>
                        <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                          {c.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{c.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-xs text-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-2 border-t border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Clinician ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={clinicianId}
                  onChange={(e) => setClinicianId(e.target.value)}
                  placeholder="e.g. DOC-001"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-mono font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Security Password / PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter clinician password"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating Clinician...</span>
              ) : (
                <>
                  <span>Sign In to Triage Station</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Medico-Legal Disclaimer Footer */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 leading-tight">
              PatientTriage.ai Prototype Environment · Authorized Clinical Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
