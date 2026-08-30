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
  Activity,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
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

export const SideNavBar = ({ isCollapsed = false, onToggle }) => {
  const { capacity, currentUser } = useHospital();
  const isSurgeActive = capacity?.surge_status && capacity.surge_status !== 'normal';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 border-r border-clinical-border bg-white flex flex-col justify-between transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Top Header & Nav Items */}
      <div>
        {/* Brand Header */}
        <div
          className={`flex h-16 items-center border-b border-clinical-border bg-white transition-all duration-200 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clinical-primary-container text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 truncate">
                <span className="text-base font-extrabold tracking-tight text-clinical-text-primary block truncate">
                  PatientTriage<span className="text-clinical-primary-container">.ai</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block -mt-0.5">
                  Clinical Precision
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={onToggle}
            title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
            className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer ${
              isCollapsed ? 'hidden' : 'block'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Live Hospital Profile Pill (Expanded Only) */}
        {!isCollapsed ? (
          <div className="p-3">
            <div className="rounded-lg border border-clinical-border bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Active Hospital
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    isSurgeActive ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isSurgeActive ? 'SURGE ACTIVE' : 'NORMAL'}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-900 truncate">
                {capacity?.name || "St. Mary's General"}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {capacity?.emergency_level || 'Level 1 Trauma Center'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center">
            <span
              title={`Active Hospital: ${capacity?.name || "St. Mary's General"} (${isSurgeActive ? 'SURGE' : 'NORMAL'})`}
              className={`h-2.5 w-2.5 rounded-full ${
                isSurgeActive ? 'bg-red-600 animate-ping' : 'bg-emerald-500'
              }`}
            />
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative group flex items-center rounded-lg transition-colors ${
                    isCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2.5 text-xs font-semibold'
                  } ${
                    isActive
                      ? 'bg-blue-50/90 text-clinical-primary-container font-bold border border-blue-200/80 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.alertBadge && isSurgeActive && (
                  <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
                )}

                {!isCollapsed && item.badge && !isSurgeActive && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-700">
                    {item.badge}
                  </span>
                )}

                {/* Floating Tooltip when Collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 z-50 hidden group-hover:flex items-center">
                    <div className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-md whitespace-nowrap">
                      {item.label}
                      {item.badge && ` (${item.badge})`}
                    </div>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Persona Pill & Expand button when collapsed */}
      <div className="border-t border-clinical-border bg-slate-50/70 p-2.5">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              title={`${currentUser.name} (${currentUser.role})`}
              className="h-8 w-8 rounded-full object-cover border border-slate-300 shadow-2xs"
            />
            <button
              type="button"
              onClick={onToggle}
              title="Expand Navigation Sidebar"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-8 w-8 rounded-full object-cover border border-slate-300 shadow-2xs shrink-0"
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
        )}
      </div>
    </aside>
  );
};

export default SideNavBar;
