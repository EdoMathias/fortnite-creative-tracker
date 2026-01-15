import React, { useState } from 'react';
import { Modal } from '../../../components';
import {
  SettingsSidebar,
  GeneralSettings,
  DataSettings,
  AboutSettings,
  HotkeysSettings,
  SettingsInfo,
} from './components';

interface SettingsProps {
  onResetGameTimeStats?: () => void;
  onClose: () => void;
  initialTab?: 'general' | 'hotkeys' | 'data' | 'about';
}

const Settings: React.FC<SettingsProps> = ({
  onResetGameTimeStats,
  onClose,
  initialTab = 'general',
}) => {
  const [showResetGameTimeModal, setShowResetGameTimeModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'hotkeys' | 'data' | 'about'>(initialTab);


  const handleResetGameTimeClick = () => {
    setShowResetGameTimeModal(true);
  };

  const handleConfirmResetGameTime = () => {
    onResetGameTimeStats?.();
    setShowResetGameTimeModal(false);
  };

  const handleCancelResetGameTime = () => {
    setShowResetGameTimeModal(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'hotkeys':
        return <HotkeysSettings />;
      case 'data':
        return <DataSettings onResetGameTimeClick={handleResetGameTimeClick} />;
      case 'about':
        return <AboutSettings />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="settings-page">
        <div className="settings-header">
          <button
            className="settings-back-button"
            onClick={onClose}
            title="Go Back"
          >
            ←
          </button>
          <h2>Settings</h2>
        </div>
        <div className="settings-container">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="settings-main">
            {renderContent()}
          </div>
          <SettingsInfo tab={activeTab} />
        </div>
      </div>

      <Modal
        isOpen={showResetGameTimeModal}
        title="Reset Game Time Stats"
        message="Are you sure you want to reset all game time statistics? This will clear your raid time, lobby time, and raids played counter. This action cannot be undone."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onConfirm={handleConfirmResetGameTime}
        onCancel={handleCancelResetGameTime}
        variant="danger"
      />
    </>
  );
};

export default Settings;
