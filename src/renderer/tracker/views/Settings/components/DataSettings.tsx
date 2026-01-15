import React from 'react';
import { Button } from '../../../../components';

interface DataSettingsProps {
  onResetGameTimeClick: () => void;
}

const DataSettings: React.FC<DataSettingsProps> = ({ onResetGameTimeClick }) => {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Game Time Stats</h3>
      <Button variant="danger" onClick={onResetGameTimeClick}>
        Reset Game Time Stats
      </Button>
    </div>
  );
};

export default DataSettings;
