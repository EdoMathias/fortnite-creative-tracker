import React, { useEffect } from 'react';
import { useLaunching } from '../contexts/LaunchingContext';
import { kBaseCreativeMapsUrl } from '../../shared/consts';

/**
 * Overlay shown when launching a game.
 * Should be placed inside the main content area (not covering ads).
 */
export const LaunchingOverlay: React.FC = () => {
  const { isLaunching, currentMapId, closeLaunching } = useLaunching();

  // Handle ESC key press
  useEffect(() => {
    if (!isLaunching) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLaunching();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLaunching, closeLaunching]);

  if (!isLaunching) return null;

  const fallbackUrl = currentMapId
    ? `${kBaseCreativeMapsUrl}/${currentMapId}`
    : null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay itself, not the modal
    if (e.target === e.currentTarget) {
      closeLaunching();
    }
  };

  return (
    <div className="launching-overlay" onClick={handleOverlayClick}>
      <div className="launching-modal">
        <div className="launching-spinner" />
        <span className="launching-text">Launching game...</span>
        {fallbackUrl && (
          <span className="launching-fallback">
            If the game did not launch,{' '}
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="launching-fallback-link"
            >
              press here
            </a>
          </span>
        )}
      </div>
    </div>
  );
};

export default LaunchingOverlay;
