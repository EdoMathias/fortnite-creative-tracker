import React from 'react';
import { GameTimeWidget } from '../widgets/GameTimeWidget';
import { ProgressWidget } from '../widgets/ProgressWidget';
import { HotkeysWidget } from '../widgets/HotkeysWidget';
import { TrackedItemsWidget } from '../widgets/TrackedItemsWidget';

export const WidgetContainer: React.FC = () => {
  return (
    <div className="widgets-container">
      <div className="widgets-grid">
        <GameTimeWidget />
        <TrackedItemsWidget />
        <ProgressWidget />
        <HotkeysWidget />
      </div>
    </div>
  );
};

