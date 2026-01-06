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
          <h2>Welcome to ArcTerminal!</h2>
          <p className="ftue-welcome-subtitle">
            Your companion for Arc Raiders to help you decide whether to sell, recycle, or keep your looted items.
            <br />
            <p className="ftue-welcome-subtitle">
              You can always access this modal from the settings menu.
            </p>
          </p>
        </div>

        <div className="ftue-welcome-content">
          <div className="ftue-feature">
            <div className="ftue-feature-icon">📊</div>
            <div className="ftue-feature-info">
              <h3>ArcTerminal</h3>
              <p>Track your owned items and mark completed stations</p>
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

