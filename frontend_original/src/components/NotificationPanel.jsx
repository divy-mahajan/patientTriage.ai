import React, { useState } from 'react';

export function NotificationPanel({ isOpen, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  const notifications = [
    {
      id: 'notif-1',
      type: 'warning',
      icon: 'warning',
      title: '2 ICU beds remaining',
      category: 'Capacity Alert',
      time: '2m ago',
      color: 'text-severity-1 bg-red-50 border-red-200',
      reason: 'ICU bed availability has dropped below the configured 25% safety threshold.',
    },
    {
      id: 'notif-2',
      type: 'info',
      icon: 'stethoscope',
      title: 'Dr. Mehta available',
      category: 'Cardiology',
      time: '8m ago',
      color: 'text-primary-container bg-blue-50 border-blue-200',
      reason: 'Attending physician checked into active shift with capacity for 5 new patients.',
    },
    {
      id: 'notif-3',
      type: 'success',
      icon: 'check_circle',
      title: 'Patient assessment complete',
      category: 'P-10025 • Sterling, Arthur',
      time: '14m ago',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      reason: 'ML priority model completed scoring (Level 2 Emergent, 80.3% risk).',
    },
  ];

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-lg">notifications</span>
          <span className="font-bold text-sm text-on-surface">Clinical Alerts</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-severity-1">
            3
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-secondary hover:text-on-surface p-1 rounded transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl border border-border/70 bg-white/80 hover:bg-surface-container-low transition-all space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-base border shrink-0 ${item.color}`}>
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                </span>
                <div>
                  <div className="font-bold text-xs text-on-surface">{item.title}</div>
                  <div className="text-[10px] text-text-secondary">{item.category}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-text-secondary shrink-0">{item.time}</span>
            </div>

            {/* Expandable Explanation ("Why am I seeing this?") */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Why am I seeing this?</span>
                <span className="material-symbols-outlined text-xs">
                  {expandedId === item.id ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedId === item.id && (
                <div className="mt-1.5 p-2 rounded bg-surface-container-low border border-border/70 text-[11px] text-text-secondary leading-snug animate-fade-in">
                  {item.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationPanel;
