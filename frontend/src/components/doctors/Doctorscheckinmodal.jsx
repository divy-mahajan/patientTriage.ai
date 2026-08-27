import React, { useState } from 'react';
import Modal from '../common/Modal';
import { doctorsApi } from '../../api/doctorsApi';
import { useHospital } from '../../context/HospitalContext';
import { UserCheck, Stethoscope } from 'lucide-react';

const SPECIALTIES = [
  'Emergency Medicine',
  'Trauma Surgery',
  'Cardiology',
  'Internal Medicine',
  'Pediatrics & Emergency',
  'Critical Care / ICU',
  'Neurology',
  'General Surgery'
];

export const DoctorCheckInModal = ({ isOpen, onClose, initialDoctor = null }) => {
  const { fetchDoctors, addNotification } = useHospital();

  const [formData, setFormData] = useState({
    doctor_id: initialDoctor?.doctor_id || `DOC-${Math.floor(100 + Math.random() * 900)}`,
    name: initialDoctor?.name || 'Dr. ',
    specialty: initialDoctor?.specialty || 'Emergency Medicine',
    shift_status: initialDoctor?.shift_status || 'Active Shift',
    is_available: initialDoctor?.is_available ?? true,
    max_caseload: initialDoctor?.max_caseload || 6,
    current_caseload: initialDoctor?.current_caseload || 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim() === 'Dr.') {
      setError('Please provide a physician full name and credentials.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await doctorsApi.checkInDoctor({
        ...formData,
        max_caseload: Number(formData.max_caseload),
        current_caseload: Number(formData.current_caseload)
      });
      addNotification(
        'Physician Shift Updated',
        `${formData.name} checked in as ${formData.shift_status}`,
        'success'
      );
      await fetchDoctors();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update physician status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDoctor ? `Update Shift: ${initialDoctor.name}` : 'Physician Shift Check-In'}
      maxWidth="max-w-lg"
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
            disabled={loading}
            className="rounded-lg bg-clinical-primary-container px-4 py-2 text-xs font-bold text-white hover:bg-clinical-primary transition shadow-xs disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save & Check-In'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 font-medium">
            {error}
          </div>
        )}

        {/* Doctor ID & Name */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Physician ID
            </label>
            <input
              type="text"
              readOnly={!!initialDoctor}
              value={formData.doctor_id}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold bg-slate-50 focus:outline-hidden"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Full Name & Credentials
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Sarah O'Connor, MD"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Specialty */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Clinical Specialty
          </label>
          <select
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {SPECIALTIES.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        {/* Shift Status & Availability */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Shift Status
            </label>
            <select
              value={formData.shift_status}
              onChange={(e) => setFormData({
                ...formData,
                shift_status: e.target.value,
                is_available: e.target.value === 'Active Shift'
              })}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="Active Shift">Active Shift</option>
              <option value="On Break">On Break</option>
              <option value="Off Duty">Off Duty</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Available for Intake
            </label>
            <select
              value={formData.is_available ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'true' })}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="true">Yes — Accepting Patients</option>
              <option value="false">No — Busy / Unavailable</option>
            </select>
          </div>
        </div>

        {/* Caseload Limits */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Max Caseload Limit
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.max_caseload}
              onChange={(e) => setFormData({ ...formData, max_caseload: parseInt(e.target.value) || 5 })}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Current Active Patients
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.current_caseload}
              onChange={(e) => setFormData({ ...formData, current_caseload: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DoctorCheckInModal;
