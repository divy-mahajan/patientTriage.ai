import React from 'react';

export function Sidebar({ currentScreen, onNavigate, isOpen, onToggleDrawer }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'intake', label: 'New Patient', icon: 'person_add' },
    { id: 'assessment', label: 'Assess', icon: 'psychology' },
    { id: 'beds', label: 'Beds', icon: 'bed' },
    { id: 'doctors', label: 'Doctors', icon: 'stethoscope' },
    { id: 'surge', label: 'Surge', icon: 'crisis_alert' },
    { id: 'audit', label: 'Audit', icon: 'history_edu' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 bg-white/90 backdrop-blur-xl border-r border-border/80 flex flex-col justify-between transition-all duration-300 ease-in-out shadow-xs ${
        isOpen ? 'w-64' : 'w-18'
      }`}
    >
      {/* Top Brand Header & Toggle */}
      <div>
        <div
          onClick={onToggleDrawer}
          className="h-16 flex items-center gap-3 px-4 border-b border-border/70 cursor-pointer hover:bg-surface-container-low transition-colors"
          title={isOpen ? 'Collapse Navigation' : 'Expand Navigation'}
        >
          <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-2xl">local_hospital</span>
          </div>

          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap animate-fade-in flex-1">
              <div className="font-bold text-sm text-on-surface tracking-tight leading-none">
                PatientTriage.ai
              </div>
              <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mt-1">
                Clinical Core
              </div>
            </div>
          )}

          {isOpen && (
            <button
              type="button"
              className="text-text-secondary hover:text-on-surface p-1 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDrawer();
              }}
            >
              <span className="material-symbols-outlined text-lg">menu_open</span>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="p-2.5 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={!isOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary-container text-white shadow-xs'
                    : 'text-text-secondary hover:text-on-surface hover:bg-surface-container-low'
                } ${!isOpen ? 'justify-center px-0' : ''}`}
              >
                <span className="material-symbols-outlined text-xl shrink-0">
                  {item.icon}
                </span>

                {isOpen && (
                  <span className="truncate whitespace-nowrap animate-fade-in font-medium text-xs">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Facility Badge */}
      <div className="p-3 border-t border-border/70">
        {isOpen ? (
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs animate-fade-in space-y-1">
            <div className="font-bold text-primary truncate">St. Mary's General</div>
            <div className="text-[11px] text-text-secondary">24 Beds • ED Live</div>
          </div>
        ) : (
          <div
            onClick={onToggleDrawer}
            className="w-10 h-10 mx-auto rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-primary-container cursor-pointer hover:bg-blue-100 transition-colors"
            title="Expand Navigation (St. Mary's General)"
          >
            <span className="material-symbols-outlined text-lg">domain</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
