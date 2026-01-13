import React, { useCallback, useEffect, useRef } from 'react';
import { Windows, WindowBase } from '@overwolf/odk-ts';

interface AppHeaderProps {
  title: string;
  appVersion?: string;
  hotkeyText?: string;
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
  showHotkey = true,
  actionButtons = []
}) => {

  const handleDragStart = useCallback(async () => {
    if (await Windows.Self()) {
      await (await Windows.Self()).move().catch((error) => {
        console.error('Error initiating window drag:', error);
      });
    }
  }, []);

  const handleMinimize = useCallback(async () => {
    if (await Windows.Self()) {
      (await Windows.Self()).minimize().catch((error) => {
        console.error('Error minimizing window:', error);
      });
    }
  }, []);

  const handleRestore = useCallback(async () => {
    if (await Windows.Self()) {
      const windowState = await (await Windows.Self()).getWindowState();
      if (windowState === 'maximized') {
        await (await Windows.Self()).restore();
      } else {
        await (await Windows.Self()).maximize();
      }
    }
  }, []);

  const handleClose = useCallback(async () => {
    if (await Windows.Self()) {
      (await Windows.Self()).close().catch((error) => {
        console.error('Error closing window:', error);
      });
    }
  }, []);

  return (
    <header id="header" className="app-header" onMouseDown={handleDragStart}>
      <img src="../../img/logo-icon.png" alt="Header icon" />
      <h1>
        {title}
        {appVersion && (
          <span className="app-version-tag">v{appVersion}</span>
        )}
      </h1>
      {showHotkey && hotkeyText && (
        <h1 className="hotkey-text">
          Show/Hide: <kbd id="hotkey">{hotkeyText}</kbd>
        </h1>
      )}
      <div className='header-drag-handle'></div>
      {actionButtons.length > 0 && (
        <div className="header-actions-group" onMouseDown={(e) => e.stopPropagation()}>
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
      <div className="window-controls-group" onMouseDown={(e) => e.stopPropagation()}>
        <button id="minimizeButton" className="window-control window-control-minimize" onClick={handleMinimize} />
        <button id="maximizeButton" className="window-control window-control-maximize" onClick={handleRestore} />
        <button id="closeButton" className="window-control window-control-close" onClick={handleClose} />
      </div>
    </header>
  );
};

