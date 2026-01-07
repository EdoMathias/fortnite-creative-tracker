import React, { useState } from 'react';
import { Modal, Button } from '../../components';
import { useFTUE } from '../../contexts/FTUEContext';
import HotKeysSettings from './Hotkeys';

interface SettingsProps {
  onResetGameTimeStats?: () => void;
  onClose: () => void;
  initialTab?: 'general' | 'hotkeys' | 'data' | 'about';
}

export const Settings: React.FC<SettingsProps> = ({ onResetGameTimeStats, onClose, initialTab = 'general' }) => {
  const [showResetGameTimeModal, setShowResetGameTimeModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'hotkeys' | 'data' | 'about'>(initialTab);
  const { resetFTUE } = useFTUE();

  const handleResetFTUE = () => {
    resetFTUE();
    onClose?.();
  };

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
        return (
          <>
            <div className="settings-main">
              <div className="settings-section">
                <h3 className="settings-section-title">Tutorial</h3>
                <Button
                  variant="secondary"
                  onClick={handleResetFTUE}
                >
                  Reset Tutorial
                </Button>
              </div>
            </div>
            <div className="settings-info">
              <h3>General Settings</h3>
              <p>Manage your general application preferences and tutorials.</p>

              <h4>Tutorial</h4>
              <p>
                Resetting the tutorial will re-enable the first-time user experience walkthrough.
                Use this if you want to review the app's features and how to use them.
              </p>
            </div>
          </>
        );
      case 'hotkeys':
        return (
          <>
            <div className="settings-main">
              <HotKeysSettings />
            </div>
            <div className="settings-info">
              <h3>Hotkeys</h3>
              <p>Customize your keyboard shortcuts for quick access to features.</p>

              <h4>Instructions</h4>
              <p>
                Click on a hotkey field and press the key combination you want to assign.
              </p>
              <p>
                Press <strong>Escape</strong> to cancel editing.
              </p>
              <p>
                Hotkeys must be unique. If you try to assign a key that is already in use, you will see an error message.
              </p>
            </div>
          </>
        );
      case 'data':
        return (
          <>
            <div className="settings-main">
              <div className="settings-section">
                <h3 className="settings-section-title">Game Time Stats</h3>
                <Button
                  variant="danger"
                  onClick={handleResetGameTimeClick}
                >
                  Reset Game Time Stats
                </Button>
              </div>
            </div>
            <div className="settings-info">
              <h3>Data Management</h3>
              <p>Manage your saved data and statistics.</p>

              <h4>Reset Game Time Stats</h4>
              <p>
                This will reset all game time statistics, including:
              </p>
              <ul>
                <li>Time spent in maps</li>
                <li>Time spent in lobby</li>
                <li>Total sessions counter</li>
              </ul>
              <p className="warning-text">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>
          </>
        );
      case 'about':
        return (
          <>
            <div className="settings-main">
              <div className="settings-section">
                <h3 className="settings-section-title">About Fortnite Map Tracker</h3>
                <p className="settings-section-description">
                  Fortnite Map Tracker is an unofficial tracker for Fortnite Creative, designed to help you track 
                  previously played maps and modes and how long you've spent in each.
                </p>

                <div
                  style={{
                    marginTop: "24px",
                    padding: "16px",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "8px",
                  }}
                >
                  {/* COPYRIGHT NOTICE */}
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--muted-foreground)",
                      fontStyle: "italic",
                    }}
                  >
                    "Fortnite® is a registered trademark of Epic Games, Inc. This application is a fan-made project 
                    and is not affiliated with, endorsed, or sponsored by Epic Games, Inc."
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-info">
              <h3>About</h3>
              <p>Legal information and credits.</p>

              <h4>Disclaimer</h4>
              <p>
                This application is a community-made fan project and is not affiliated with, endorsed, or sponsored
                by Epic Games, Inc. or the developers of Fortnite.
              </p>
            </div>
          </>
        );
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
          <div className="settings-sidebar">
            <button
              className={`settings-sidebar-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              className={`settings-sidebar-item ${activeTab === 'hotkeys' ? 'active' : ''}`}
              onClick={() => setActiveTab('hotkeys')}
            >
              Hotkeys
            </button>
            <button
              className={`settings-sidebar-item ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Data
            </button>
            <button
              className={`settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
          </div>
          {renderContent()}
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

