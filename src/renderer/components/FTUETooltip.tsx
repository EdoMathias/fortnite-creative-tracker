import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useFTUE } from '../contexts/FTUEContext';
import { FTUEStep } from '../contexts/FTUEContext';

interface FTUETooltipProps {
  step: FTUEStep;
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  targetSelector?: string;
  onDismiss?: () => void;
  showSkip?: boolean;
}

export const FTUETooltip: React.FC<FTUETooltipProps> = ({
  step,
  title,
  message,
  position = 'bottom',
  targetSelector,
  onDismiss,
  showSkip = true
}) => {
  const { shouldShowStep, markStepComplete } = useFTUE();
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
  const [spotlightStyle, setSpotlightStyle] = useState<{
    top: React.CSSProperties;
    bottom: React.CSSProperties;
    left: React.CSSProperties;
    right: React.CSSProperties;
  } | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => shouldShowStep(step));
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = shouldShowStep(step) && isVisible;

  useEffect(() => {
    if (!show || !targetSelector) return;

    const updatePosition = () => {
      const target = document.querySelector(targetSelector);
      if (!target || !tooltipRef.current) return;

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const spacing = 12;
      const padding = 8; // Padding around target for spotlight cutout

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - spacing;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = targetRect.bottom + spacing;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + spacing;
          break;
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 0) left = spacing;
      if (left + tooltipRect.width > viewportWidth) {
        left = viewportWidth - tooltipRect.width - spacing;
      }
      if (top < 0) top = spacing;
      if (top + tooltipRect.height > viewportHeight) {
        top = viewportHeight - tooltipRect.height - spacing;
      }

      setPositionStyle({ top: `${top}px`, left: `${left}px` });

      // Calculate spotlight cutout (4 overlays: top, bottom, left, right)
      const cutoutTop = targetRect.top - padding;
      const cutoutBottom = targetRect.bottom + padding;
      const cutoutLeft = targetRect.left - padding;
      const cutoutRight = targetRect.right + padding;

      setSpotlightStyle({
        top: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${Math.max(0, cutoutTop)}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto',
          cursor: 'pointer'
        },
        bottom: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${Math.max(0, viewportHeight - cutoutBottom)}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto',
          cursor: 'pointer'
        },
        left: {
          position: 'fixed',
          top: `${cutoutTop}px`,
          left: 0,
          width: `${Math.max(0, cutoutLeft)}px`,
          height: `${cutoutBottom - cutoutTop}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto',
          cursor: 'pointer'
        },
        right: {
          position: 'fixed',
          top: `${cutoutTop}px`,
          right: 0,
          width: `${Math.max(0, viewportWidth - cutoutRight)}px`,
          height: `${cutoutBottom - cutoutTop}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          pointerEvents: 'auto',
          cursor: 'pointer'
        }
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    // Small delay to ensure DOM is ready
    setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [show, targetSelector, position]);

  // Update visibility when step completion status changes
  useLayoutEffect(() => {
    const shouldShow = shouldShowStep(step);
    if (!shouldShow) {
      setIsVisible(false);
    } else if (!isVisible && shouldShow) {
      // Reset visibility if step should be shown again (e.g., after reset)
      setIsVisible(true);
    }
  }, [shouldShowStep, step, isVisible]);

  if (!show) return null;

  const completeStep = () => {
    setIsVisible(false);
    markStepComplete(step);
    onDismiss?.();
  };

  const handleGotIt = () => {
    completeStep();
  };

  const handleSkip = () => {
    completeStep();
  };

  const handleOverlayClick = () => {
    completeStep();
  };

  return (
    <>
      {spotlightStyle && (
        <>
          <div style={spotlightStyle.top} onClick={handleOverlayClick} />
          <div style={spotlightStyle.bottom} onClick={handleOverlayClick} />
          <div style={spotlightStyle.left} onClick={handleOverlayClick} />
          <div style={spotlightStyle.right} onClick={handleOverlayClick} />
        </>
      )}
      <div
        ref={tooltipRef}
        className={`ftue-tooltip ftue-tooltip-${position}`}
        style={positionStyle}
      >
        <div className="ftue-tooltip-header">
          <h4 className="ftue-tooltip-title">{title}</h4>
          {showSkip && (
            <button
              className="ftue-tooltip-close"
              onClick={handleSkip}
              aria-label="Skip"
            >
              ×
            </button>
          )}
        </div>
        <p className="ftue-tooltip-message">{message}</p>
        <div className="ftue-tooltip-footer">
          <button className="ftue-tooltip-button" onClick={handleGotIt}>
            Got it
          </button>
        </div>
      </div>
    </>
  );
};

