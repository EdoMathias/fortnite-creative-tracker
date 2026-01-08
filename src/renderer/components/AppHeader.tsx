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
  const windowRef = useRef<WindowBase | null>(null);

  // Cache the window reference on mount so drag can be called synchronously
  // this fixed an issue where the window enchored to the center of the screen 
  // when starting to drag the window
  useEffect(() => {
    Windows.Self().then((window) => {
      windowRef.current = window;
    }).catch((error) => {
      console.error('Error getting window reference:', error);
    });
  }, []);

  const handleDragStart = useCallback(() => {
    if (windowRef.current) {
      windowRef.current.move().catch((error) => {
        console.error('Error initiating window drag:', error);
      });
    }
  }, []);

  const handleMinimize = useCallback(() => {
    if (windowRef.current) {
      windowRef.current.minimize().catch((error) => {
        console.error('Error minimizing window:', error);
      });
    }
  }, []);

  const handleRestore = useCallback(async () => {
    if (windowRef.current) {
      const windowState = await windowRef.current.getWindowState();
      if (windowState === 'maximized') {
        await windowRef.current.restore();
      } else {
        await windowRef.current.maximize();
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    if (windowRef.current) {
      windowRef.current.close().catch((error) => {
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

