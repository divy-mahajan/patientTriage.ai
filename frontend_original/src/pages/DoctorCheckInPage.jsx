import React, { useState, useEffect, useCallback } from 'react';
import { Stethoscope, UserCheck, UserPlus, Activity, Plus, RefreshCw } from 'lucide-react';
import { doctorsAPI } from '../services/api';
import CaseloadBarChart from '../components/doctors/CaseloadBarChart';

export function DoctorCheckInPage() {
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check-in form state
  const [checkInForm, setCheckInForm] = useState({
    doctor_id: `DOC-00${Math.floor(Math.random() * 90 + 10)}`,
    name: '',
    specialty: 'Emergency Medicine',
    shift_status: 'Active Shift',
    max_caseload: 5,
  });
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  const fetchRoster = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await doctorsAPI.listRoster();
      setDoctorsList(data.doctors || []);
    } catch (err) {
      console.error('Error fetching doctor roster:', err);
      setError('Unable to load live physician roster.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingCheckIn(true);
    try {
      await doctorsAPI.checkInDoctor({
        doctor_id: checkInForm.doctor_id,
        name: checkInForm.name,
        specialty: checkInForm.specialty,
        shift_status: checkInForm.shift_status,
        is_available: checkInForm.shift_status === 'Active Shift',
        max_caseload: Number(checkInForm.max_caseload),
        current_caseload: 0,
      });
      setShowCheckInModal(false);
      setCheckInForm({
        doctor_id: `DOC-00${Math.floor(Math.random() * 90 + 10)}`,
        name: '',
        specialty: 'Emergency Medicine',
        shift_status: 'Active Shift',
        max_caseload: 5,
      });
      await fetchRoster();
    } catch (err) {
      console.error('Error checking in physician:', err);
      alert('Failed to check-in physician: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const filteredDoctors =
    specialtyFilter === 'All'
      ? doctorsList
      : doctorsList.filter((d) => d.specialty.toLowerCase().includes(specialtyFilter.toLowerCase()));

  const activeCount = doctorsList.filter((d) => d.shift_status === 'Active Shift').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-clinical-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-clinical-text-secondary uppercase tracking-wider mb-1">
            <span>Staffing Management</span>
            <span>•</span>
            <span>Attending Physician Roster</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-clinical-text-primary tracking-tight">
            Physician Roster & Shift Status
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs">
            {activeCount} Physicians On Shift
          </span>
          <button
            type="button"
            onClick={() => setShowCheckInModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Check-In Physician</span>
          </button>
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
            onClick={fetchRoster}
            className="px-3 py-1 bg-white border border-red-200 rounded font-bold hover:bg-red-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Caseload Utilization Summary Card */}
      <div className="rounded-xl border border-clinical-border bg-white p-5 shadow-2xs">
        <CaseloadBarChart doctors={doctorsList} />
      </div>

      {/* Specialty Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['All', 'Emergency Medicine', 'Cardiology', 'Trauma Surgery', 'Pediatric', 'Internal Medicine'].map(
          (spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSpecialtyFilter(spec)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                specialtyFilter === spec
                  ? 'bg-clinical-primary-container text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {spec}
            </button>
          )
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="p-12 bg-white border border-clinical-border rounded-xl text-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 rounded-full border-2 border-clinical-primary-container border-t-transparent animate-spin mx-auto"></div>
          <div className="text-xs font-semibold text-slate-500">Loading live physician roster...</div>
        </div>
      ) : (
        /* Doctor Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.doctor_id}
              className={`bg-white border rounded-xl p-5 shadow-2xs space-y-3 transition-all ${
                doc.shift_status === 'Active Shift'
                  ? 'border-clinical-border hover:border-slate-400'
                  : 'border-slate-200 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{doc.name}</h3>
                  <div className="text-xs text-clinical-primary-container font-semibold">{doc.specialty}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{doc.doctor_id}</div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    doc.shift_status === 'Active Shift'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : doc.shift_status === 'On Break'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {doc.shift_status}
                </span>
              </div>

              {/* Caseload Bar */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Active Caseload:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {doc.current_caseload} / {doc.max_caseload}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      doc.current_caseload >= doc.max_caseload
                        ? 'bg-red-500'
                        : doc.current_caseload / doc.max_caseload > 0.6
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min((doc.current_caseload / Math.max(1, doc.max_caseload)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCheckInSubmit}
            className="bg-white border border-clinical-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="font-bold text-base text-slate-900">Physician Shift Check-In</h3>
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Doctor ID</label>
                <input
                  type="text"
                  required
                  value={checkInForm.doctor_id}
                  onChange={(e) => setCheckInForm({ ...checkInForm, doctor_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Physician Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sarah Jenkins, MD"
                  value={checkInForm.name}
                  onChange={(e) => setCheckInForm({ ...checkInForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Clinical Specialty</label>
                <select
                  value={checkInForm.specialty}
                  onChange={(e) => setCheckInForm({ ...checkInForm, specialty: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Trauma Surgery">Trauma Surgery</option>
                  <option value="Pediatric Emergency">Pediatric Emergency</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Critical Care (ICU)">Critical Care (ICU)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Shift Status</label>
                <select
                  value={checkInForm.shift_status}
                  onChange={(e) => setCheckInForm({ ...checkInForm, shift_status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="Active Shift">Active Shift (On Duty)</option>
                  <option value="On Break">On Break (Temporary Standby)</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Max Caseload Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={checkInForm.max_caseload}
                  onChange={(e) => setCheckInForm({ ...checkInForm, max_caseload: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-clinical-border">
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingCheckIn}
                className="px-4 py-2 rounded-lg bg-clinical-primary-container hover:bg-clinical-primary text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmittingCheckIn ? 'Recording Check-In...' : 'Confirm Check-In'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default DoctorCheckInPage;
