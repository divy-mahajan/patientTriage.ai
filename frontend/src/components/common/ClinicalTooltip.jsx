import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * High-performance clinical portal tooltip.
 * Dynamically computes viewport boundaries to position above/below without
 * getting clipped by table overflows or altering row layout.
 */
export function ClinicalTooltip({ content, children, maxWidth = 400 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placeAbove: false, width: 300 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(maxWidth, window.innerWidth - 32);
    const estimatedHeight = 90;
    const padding = 8;

    const placeAbove = rect.bottom + estimatedHeight + padding > window.innerHeight - 20;

    let top = placeAbove
      ? rect.top - padding
      : rect.bottom + padding;

    let left = rect.left;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      placeAbove,
      width: tooltipWidth,
    });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        tabIndex={0}
        className="inline-block w-full outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:rounded"
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="p-3 bg-white text-slate-900 border border-slate-300 rounded-xl shadow-xl pointer-events-none transition-all duration-150 ease-out animate-fade-in text-xs font-sans"
            role="tooltip"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
              <span>Chief Complaint Detail</span>
            </div>
            <div className="leading-relaxed font-normal text-slate-800 whitespace-normal break-words">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default ClinicalTooltip;
