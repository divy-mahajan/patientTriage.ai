import React from 'react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'neutral', // 'up' | 'down' | 'neutral' | 'critical'
  variant = 'default', // 'default' | 'critical' | 'warning' | 'success' | 'primary'
  onClick,
  className = ''
}) => {
  const variantStyles = {
    default: 'bg-white border-clinical-border text-clinical-text-primary',
    critical: 'bg-red-50/70 border-red-200 text-red-950 shadow-sm shadow-red-100',
    warning: 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-sm shadow-amber-100',
    success: 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-sm shadow-emerald-100',
    primary: 'bg-blue-50/70 border-blue-200 text-blue-950 shadow-sm shadow-blue-100'
  }[variant] || 'bg-white border-clinical-border text-clinical-text-primary';

  const iconStyles = {
    default: 'bg-slate-100 text-slate-700',
    critical: 'bg-red-600 text-white animate-pulse',
    warning: 'bg-amber-500 text-white',
    success: 'bg-emerald-600 text-white',
    primary: 'bg-clinical-primary-container text-white'
  }[variant] || 'bg-slate-100 text-slate-700';

  const trendColors = {
    up: 'text-emerald-700 bg-emerald-100',
    down: 'text-slate-600 bg-slate-100',
    critical: 'text-red-700 bg-red-100 font-semibold',
    neutral: 'text-slate-600 bg-slate-100'
  }[trendDirection] || 'text-slate-600 bg-slate-100';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg border p-4 transition-all duration-200 ${variantStyles} ${
        onClick ? 'cursor-pointer hover:shadow-clinical-md hover:border-slate-400' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-clinical-text-secondary">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-clinical-text-primary">
              {value}
            </span>
            {trend && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${trendColors}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-clinical-text-secondary font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconStyles}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
