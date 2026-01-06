import React from 'react';

interface AppHeaderProps {
  hotkeyText: string;
  itemCount: number;
  showHotkey?: boolean;
  onSettingsClick?: () => void;
  onSubmissionFormClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  hotkeyText, 
  itemCount, 
  showHotkey = true,
  onSettingsClick,
  onSubmissionFormClick
}) => {
  return (
    <header id="header" className="app-header">
      <img src="../../img/logo-icon.png" alt="Header icon" />
      <h1>ArcTerminal - Desktop</h1>
      {showHotkey ? (
        <h1 className="hotkey-text">
          Show/Hide: <kbd id="hotkey">{hotkeyText}</kbd> • Tracking {itemCount} items
        </h1>
      ) : (
        <h1 className="hotkey-text">
          Tracking {itemCount} items
        </h1>
      )}
      <div className="header-actions-group">
        <button 
          className="header-action-button" 
          onClick={onSettingsClick}
          title="Settings"
        >
          ⚙️
        </button>
        <button 
          className="header-action-button" 
          onClick={onSubmissionFormClick}
          title="Submit Feedback"
        >
          📝
        </button>
      </div>
      <div className="window-controls-group">
        <button id="minimizeButton" className="window-control window-control-minimize" />
        <button id="maximizeButton" className="window-control window-control-maximize" />
        <button id="closeButton" className="window-control window-control-close" />
      </div>
    </header>
  );
};


