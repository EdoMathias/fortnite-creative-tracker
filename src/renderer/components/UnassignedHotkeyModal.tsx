import React from 'react';
import { Button } from './Button';

interface UnassignedHotkeyModalProps {
  unassignedHotkeys: string[];
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export const UnassignedHotkeyModal: React.FC<UnassignedHotkeyModalProps> = ({ 
  unassignedHotkeys, 
  onOpenSettings, 
  onDismiss 
}) => {
  return (
    <div className="ftue-overlay">
      <div className="ftue-welcome-modal">
        <div className="ftue-welcome-header">
          <h2>Unassigned Hotkeys Detected</h2>
          <p className="ftue-welcome-subtitle" style={{ color: 'var(--destructive)' }}>
            Some hotkeys could not be assigned because they are already in use by another app.
          </p>
        </div>

        <div className="ftue-welcome-content">
          <p style={{ marginBottom: '16px', color: 'var(--muted-foreground)' }}>
            The following actions currently have no hotkey assigned:
          </p>
          
          <div className="ftue-feature-list" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
            {unassignedHotkeys.map((hotkeyName) => (
              <div key={hotkeyName} className="ftue-feature" style={{ padding: '12px' }}>
                <div className="ftue-feature-icon" style={{ color: 'var(--destructive)' }}>⚠️</div>
                <div className="ftue-feature-info">
                  <h3 style={{ fontSize: '14px' }}>{hotkeyName}</h3>
                  <p style={{ fontSize: '12px' }}>Please assign a new key combination in Settings.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ftue-welcome-footer" style={{ gap: '12px' }}>
          <Button onClick={onDismiss} variant="secondary">
            Dismiss
          </Button>
          <Button onClick={onOpenSettings} variant="primary">
            Open Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
