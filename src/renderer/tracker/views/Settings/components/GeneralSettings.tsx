import React from 'react';
import { Button } from '../../../../components';
import { useFTUE } from '../../../../contexts/FTUEContext';

const GeneralSettings: React.FC = () => {
  const { resetFTUE } = useFTUE();

  const handleResetFTUE = () => {
    resetFTUE();
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Tutorial</h3>
      <Button variant="secondary" onClick={handleResetFTUE}>
        Reset Tutorial
      </Button>
    </div>
  );
};

export default GeneralSettings;
