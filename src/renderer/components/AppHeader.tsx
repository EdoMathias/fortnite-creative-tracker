import React from 'react';

interface AppHeaderProps {
  title: string;
  appVersion?: string;
  hotkeyText?: string;
  itemCount?: number;
  showHotkey?: boolean;
  actionButtons?: Array<{
    icon: string;
    title: string;
    onClick: () => void;
  }>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  appVersion,
  hotkeyText,
  itemCount,
  showHotkey = true,
  actionButtons = []
}) => {
  return (
    <header id="header" className="app-header">
      <img src="../../img/logo-icon.png" alt="Header icon" />
      <h1>
        {title}
        {appVersion && (
          <span className="app-version-tag">v{appVersion}</span>
        )}
      </h1>
      {showHotkey && hotkeyText ? (
        <h1 className="hotkey-text">
          {itemCount !== undefined ? (
            <>
              Show/Hide: <kbd id="hotkey">{hotkeyText}</kbd> • Tracking {itemCount} items
            </>
          ) : (
            <>
              Show/Hide: <kbd id="hotkey">{hotkeyText}</kbd>
            </>
          )}
        </h1>
      ) : itemCount !== undefined ? (
        <h1 className="hotkey-text">
          Tracking {itemCount} items
        </h1>
      ) : null}
      {actionButtons.length > 0 && (
        <div className="header-actions-group">
          {actionButtons.map((button, index) => (
            <button
              key={index}
              className="header-action-button"
              onClick={button.onClick}
              title={button.title}
            >
              {button.icon}
            </button>
          ))}
        </div>
      )}
      <div className="window-controls-group">
        <button id="minimizeButton" className="window-control window-control-minimize" />
        <button id="maximizeButton" className="window-control window-control-maximize" />
        <button id="closeButton" className="window-control window-control-close" />
      </div>
    </header>
  );
};

