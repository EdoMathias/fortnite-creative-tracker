import React from 'react';
import { GameTimeWidget, HotkeysWidget } from './components';

/**
 * Widgets view - displays customizable widgets for game tracking
 */
const Widgets: React.FC = () => {
  return (
    <div className="widgets-page-container">
      <div className="widgets-page-header">
        <div className="widgets-page-header-left">
          <h2 className="widgets-page-title">Widgets</h2>
          <p className="widgets-page-subtitle">
            Monitor your gameplay with customizable widgets
          </p>
        </div>
      </div>

      <div className="widgets-page-grid">
        <GameTimeWidget />
        <HotkeysWidget />
      </div>
    </div>
  );
};

export default Widgets;
