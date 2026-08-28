import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * High-performance clinical portal tooltip.
 * Dynamically computes viewport boundaries to position above/below without
 * getting clipped by table overflows or altering row layout.
 */
export function ClinicalTooltip({ content, children, maxWidth = 400 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placeAbove: false });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(maxWidth, window.innerWidth - 32);
    const estimatedHeight = 90; // Typical multi-line complaint height
    const padding = 8;

    // Check if space below is constrained (< 130px from bottom viewport)
    const placeAbove = rect.bottom + estimatedHeight + padding > window.innerHeight - 20;

    let top = placeAbove
      ? rect.top - padding // Will translate -100% in CSS
      : rect.bottom + padding;

    // Center or left-align relative to trigger, but clamp within window viewport
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
        className="inline-block w-full outline-none focus-visible:ring-1 focus-visible:ring-primary-container focus-visible:rounded"
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
            className="p-3 bg-white/95 backdrop-blur-md text-on-surface border border-border/90 rounded-xl shadow-xl pointer-events-none transition-all duration-150 ease-out animate-fade-in text-xs"
            role="tooltip"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
              <span className="material-symbols-outlined text-xs">clinical_notes</span>
              <span>Chief Complaint Detail</span>
            </div>
            <div className="leading-relaxed font-normal text-on-surface whitespace-normal break-words">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default ClinicalTooltip;
