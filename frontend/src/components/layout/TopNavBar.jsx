import React, { useState, useEffect } from 'react';
import {
  Bell,
  RefreshCw,
  Clock,
  Building2,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useHospital, CLINICIAN_PERSONAS } from '../../context/HospitalContext';

export const TopNavBar = () => {
  const {
    capacity,
    refreshAll,
    loading,
    swapProfile,
    currentUser,
    setCurrentUser,
    notifications
  } = useHospital();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalBeds = capacity?.summary?.total_beds || 24;
  const availBeds = capacity?.summary?.available_beds || 0;
  const waitingCount = capacity?.waiting_room?.current_occupancy || 0;

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-clinical-border bg-white px-6">
      {/* Left: Department & Hospital Profile Swapper */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-lg border border-clinical-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-clinical-text-primary hover:bg-slate-100 transition shadow-2xs"
          >
            <Building2 className="h-4 w-4 text-clinical-primary-container" />
            <span className="truncate max-w-[200px] sm:max-w-none">
              {capacity?.name || "St. Mary's General Hospital"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl border border-clinical-border bg-white p-2 shadow-xl z-50">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Hospital Profile
              </div>
              <button
                onClick={() => {
                  swapProfile('st_marys_general');
                  setShowProfileMenu(false);
                }}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-100 transition ${
                  capacity?.hospital_id === 'st_marys_general' ? 'bg-blue-50 text-clinical-primary-container font-bold' : 'text-slate-700'
                }`}
              >
                <div>St. Mary's General Hospital</div>
                <div className="text-[10px] text-slate-400 font-normal">Level 1 Trauma · 24 Beds</div>
              </button>
              <button
                onClick={() => {
                  swapProfile('metro_trauma_center');
                  setShowProfileMenu(false);
                }}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-100 transition mt-1 ${
                  capacity?.hospital_id === 'metro_trauma_center' ? 'bg-blue-50 text-clinical-primary-container font-bold' : 'text-slate-700'
                }`}
              >
                <div>Metro Trauma Center</div>
                <div className="text-[10px] text-slate-400 font-normal">High Acuity Urban · 36 Beds</div>
              </button>
            </div>
          )}
        </div>

        {/* Live Quick Counters */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200 font-semibold font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            <span>Beds: {availBeds}/{totalBeds}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2.5 py-1 text-orange-800 border border-orange-200 font-semibold font-mono">
            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
            <span>Lobby: {waitingCount} waiting</span>
          </div>
        </div>
      </div>

      {/* Right: Live Clock, Refresh, Notifications, User Switcher */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-mono font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-clinical-border">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshAll}
          disabled={loading}
          title="Refresh All Hospital & Patient Data"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-clinical-border bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-clinical-primary-container' : ''}`} />
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-clinical-border bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white font-mono">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-clinical-border bg-white shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between border-b border-clinical-border pb-2 mb-2">
                <span className="text-xs font-bold text-clinical-text-primary">
                  Clinical Notifications ({notifications.length})
                </span>
                <span className="text-[10px] text-slate-400">Real-time Feed</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-lg p-2.5 text-xs border ${
                      notif.type === 'critical'
                        ? 'bg-red-50/80 border-red-200 text-red-900'
                        : notif.type === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : notif.type === 'success'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {notif.type === 'critical' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      ) : notif.type === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Info className="h-3.5 w-3.5 text-blue-600" />
                      )}
                      <span>{notif.title}</span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-90 leading-tight">
                      {notif.message}
                    </p>
                    <span className="mt-1 block text-[9px] font-mono opacity-70">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg border border-clinical-border bg-slate-50 px-2.5 py-1.5 hover:bg-slate-100 transition"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-6 w-6 rounded-full object-cover border border-slate-300"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-clinical-text-primary leading-none">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                {currentUser.role.split(',')[0]}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-clinical-border bg-white p-2 shadow-2xl z-50">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Clinician Persona
              </div>
              {CLINICIAN_PERSONAS.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    setCurrentUser(person);
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-lg p-2 text-left text-xs transition ${
                    currentUser.id === person.id ? 'bg-blue-50 text-clinical-primary-container font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <img src={person.avatar} alt={person.name} className="h-7 w-7 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold">{person.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{person.role}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
