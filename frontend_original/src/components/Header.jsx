import React, { useState, useEffect, useCallback } from 'react';
import NotificationPanel from './NotificationPanel';
import { hospitalAPI } from '../services/api';

export function Header({ isDrawerOpen, onToggleDrawer, currentClinician, onSignOut }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hospitalCapacity, setHospitalCapacity] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [isSwapping, setIsSwapping] = useState(false);

  const fetchHospitalData = useCallback(async () => {
    try {
      const [capRes, profRes] = await Promise.all([
        hospitalAPI.getCapacity().catch(() => null),
        hospitalAPI.listProfiles().catch(() => ({ profiles: [] })),
      ]);
      if (capRes) setHospitalCapacity(capRes);
      if (profRes?.profiles) setAvailableProfiles(profRes.profiles);
    } catch (err) {
      console.warn('Could not load hospital capacity in header:', err);
    }
  }, []);

  useEffect(() => {
    fetchHospitalData();
  }, [fetchHospitalData]);

  const handleSwapProfile = async (hospitalId) => {
    setIsSwapping(true);
    try {
      const updated = await hospitalAPI.swapProfile(hospitalId);
      setHospitalCapacity(updated);
      setShowProfileMenu(false);
      // Trigger a page refresh or custom event so dashboard/bedmap update
      window.dispatchEvent(new CustomEvent('hospital-profile-swapped', { detail: updated }));
    } catch (err) {
      console.error('Error swapping profile:', err);
    } finally {
      setIsSwapping(false);
    }
  };

  const clinician = currentClinician || {
    name: 'Dr. Sarah Jenkins, MD',
    role: 'Attending Triage Officer',
    shift: '07:00–19:00',
    department: 'Emergency Department',
  };

  const initials = clinician.name
    .split(' ')
    .filter((n) => !n.includes('.'))
    .map((n) => n[0])
    .slice(0, 2)
    .join('') || 'SJ';

  const hospitalName = hospitalCapacity?.name || "St. Mary's General Hospital";
  const emergencyLevel = hospitalCapacity?.emergency_level || "Level 1 Trauma";
  const activeHospitalId = hospitalCapacity?.hospital_id || "st_marys_general";

  return (
    <header
      className={`bg-white/85 backdrop-blur-xl h-16 w-full fixed top-0 z-40 border-b border-border/80 flex justify-between items-center pr-8 transition-all duration-300 ease-in-out shadow-xs ${
        isDrawerOpen ? 'pl-68' : 'pl-24'
      }`}
    >
      {/* Left: Department context & Dynamic Hospital Profile Swapper */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleDrawer}
          className="p-1.5 rounded-lg border border-border/70 text-text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          title={isDrawerOpen ? 'Collapse Navigation' : 'Expand Navigation'}
        >
          <span className="material-symbols-outlined text-lg">
            {isDrawerOpen ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Dynamic Hospital Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left cursor-pointer shadow-2xs"
            title="Switch Active Hospital JSON Profile"
          >
            <span className="material-symbols-outlined text-base text-primary-container">local_hospital</span>
            <div className="leading-tight">
              <span className="font-bold text-xs sm:text-sm text-on-surface tracking-tight block truncate max-w-[180px] sm:max-w-[240px]">
                {hospitalName}
              </span>
              <span className="text-[10px] text-text-secondary font-medium block">
                {emergencyLevel}
              </span>
            </div>
            <span className="material-symbols-outlined text-sm text-text-secondary">
              {showProfileMenu ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl border border-border bg-white p-2 shadow-xl z-50 animate-fade-in space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary border-b border-border mb-1">
                Active Hospital Profiles (JSON Driven)
              </div>
              {availableProfiles.map((prof) => (
                <button
                  key={prof.hospital_id}
                  type="button"
                  disabled={isSwapping}
                  onClick={() => handleSwapProfile(prof.hospital_id)}
                  className={`w-full text-left rounded-lg p-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    prof.hospital_id === activeHospitalId
                      ? 'bg-blue-50 text-primary font-bold border border-blue-200'
                      : 'hover:bg-slate-50 text-on-surface'
                  }`}
                >
                  <div>
                    <div className="font-bold">{prof.name}</div>
                    <div className="text-[10px] text-text-secondary font-normal">
                      {prof.emergency_level} · {prof.total_beds} Beds
                    </div>
                  </div>
                  {prof.hospital_id === activeHospitalId && (
                    <span className="material-symbols-outlined text-primary text-base">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Stream
        </span>
      </div>

      {/* Right: Shift, Notifications & Authenticated Clinician */}
      <div className="flex items-center gap-3 relative">
        {/* Shift Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-text-secondary px-2.5 py-1 rounded-lg bg-surface-container-low border border-border/60">
          <span className="material-symbols-outlined text-sm text-emerald-600">schedule</span>
          <span className="font-medium">Shift: {clinician.shift || '07:00–19:00'}</span>
        </div>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Clinical Alerts"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
              isNotifOpen
                ? 'bg-blue-50 border-primary-container text-primary-container shadow-xs'
                : 'border-border/80 text-text-secondary hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            <span className="w-2 h-2 rounded-full bg-severity-1 absolute top-2 right-2"></span>
          </button>

          <NotificationPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        <div className="h-5 w-px bg-border/80 hidden sm:block"></div>

        {/* Authenticated Clinician Chip */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center border border-primary-container shadow-xs">
            {initials}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-on-surface leading-tight truncate max-w-[130px]">
              {clinician.name}
            </div>
            <div className="text-[10px] text-text-secondary truncate max-w-[130px]">
              {clinician.role}
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out"
            className="ml-1 p-1.5 rounded-lg border border-border/80 text-text-secondary hover:text-severity-1 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
