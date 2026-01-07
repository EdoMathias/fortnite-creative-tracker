import React, { useEffect, useState } from 'react';
import { useFTUE } from '../contexts/FTUEContext';
import { OWHotkeys } from '@overwolf/overwolf-api-ts';
import { kHotkeys, kGameClassIds } from '../../shared/consts';
import { Button } from './Button';
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('FTUEWelcomeModal');

export const FTUEWelcomeModal: React.FC = () => {
  const { shouldShowStep, markStepComplete } = useFTUE();
  const [hotkeys, setHotkeys] = useState<{
    trackMeIngame: string;
    trackMeDesktop: string;
  }>({
    trackMeIngame: 'Ctrl+G',
    trackMeDesktop: 'Ctrl+Shift+G',
  });

  const show = shouldShowStep('welcome');

  useEffect(() => {
    if (!show) return;

    const loadHotkeys = async () => {
      try {
        const [trackMeIngame, trackMeDesktop] = await Promise.all([
          OWHotkeys.getHotkeyText(kHotkeys.toggleTrackerIngameWindow, kGameClassIds[0]),
          OWHotkeys.getHotkeyText(kHotkeys.toggleTrackerDesktopWindow, kGameClassIds[0]),
        ]);
        setHotkeys({ trackMeIngame, trackMeDesktop });
      } catch (error) {
        logger.error('Error loading hotkeys:', error);
      }
    };

    loadHotkeys();
  }, [show]);

  if (!show) return null;

  const handleGotIt = () => {
    markStepComplete('welcome');
  };

  return (
    <div className="ftue-overlay">
      <div className="ftue-welcome-modal">
        <div className="ftue-welcome-header">
          <h2>Welcome to Fortnite Map Tracker!</h2>
          <p className="ftue-welcome-subtitle">
            Track your Creative map sessions and discover trending maps.
          </p>
        </div>

        <div className="ftue-welcome-content">
          <div className="ftue-feature">
            <div className="ftue-feature-icon">🗺️</div>
            <div className="ftue-feature-info">
              <h3>Map Tracking</h3>
              <p>See your playtime, top maps, and session statistics</p>
              <span>Show/Hide the window in-game with: </span>
              <div className="ftue-hotkey-badge">{hotkeys.trackMeIngame}</div>
              <br />
              <span>Show/Hide the window on desktop with: </span>
              <div className="ftue-hotkey-badge">{hotkeys.trackMeDesktop}</div>
            </div>
          </div>

          <div className="ftue-welcome-footer">
            <Button onClick={handleGotIt} variant="primary" size="large">
              Got it!
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

