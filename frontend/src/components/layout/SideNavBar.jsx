import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Sparkles,
  Bed,
  Stethoscope,
  AlertOctagon,
  FileClock,
  ShieldCheck,
  Building2,
  Activity
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Triage Overview', icon: LayoutDashboard, badge: 'Live' },
  { path: '/intake', label: 'New Patient Intake', icon: UserPlus },
  { path: '/assessment', label: 'AI Risk & Explain', icon: Sparkles },
  { path: '/beds', label: 'Bed Department Map', icon: Bed },
  { path: '/doctors', label: 'Physician Workstation', icon: Stethoscope },
  { path: '/surge', label: 'Surge Mode Console', icon: AlertOctagon, alertBadge: true },
  { path: '/audit', label: 'Clinical Audit Log', icon: FileClock },
];

export const SideNavBar = () => {
  const { capacity, currentUser } = useHospital();
  const isSurgeActive = capacity?.surge_status && capacity.surge_status !== 'normal';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 border-r border-clinical-border bg-white flex flex-col justify-between">
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center gap-3 border-b border-clinical-border px-5 bg-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-clinical-primary-container text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-clinical-text-primary">
                PatientTriage<span className="text-clinical-primary-container">.ai</span>
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Clinical Precision
            </span>
          </div>
        </div>

        {/* Live Hospital Profile Pill */}
        <div className="p-3">
          <div className="rounded-lg border border-clinical-border bg-slate-50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active Hospital
              </span>
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                isSurgeActive ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isSurgeActive ? 'SURGE ACTIVE' : 'NORMAL'}
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-900 truncate">
              {capacity?.name || "St. Mary's General"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {capacity?.emergency_level || "Level 1 Trauma Center"}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50/80 text-clinical-primary-container font-bold border border-blue-200/80 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.alertBadge && isSurgeActive && (
                  <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
                )}
                {item.badge && !isSurgeActive && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Persona Pill */}
      <div className="border-t border-clinical-border p-3 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="h-8 w-8 rounded-full object-cover border border-slate-300 shadow-2xs"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-clinical-text-primary truncate">
              {currentUser.name}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {currentUser.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SideNavBar;
