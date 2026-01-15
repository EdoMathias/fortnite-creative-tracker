import React from 'react';

interface SettingsSidebarProps {
  activeTab: 'general' | 'hotkeys' | 'data' | 'about';
  onTabChange: (tab: 'general' | 'hotkeys' | 'data' | 'about') => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="settings-sidebar">
      <button
        className={`settings-sidebar-item ${activeTab === 'general' ? 'active' : ''}`}
        onClick={() => onTabChange('general')}
      >
        General
      </button>
      <button
        className={`settings-sidebar-item ${activeTab === 'hotkeys' ? 'active' : ''}`}
        onClick={() => onTabChange('hotkeys')}
      >
        Hotkeys
      </button>
      <button
        className={`settings-sidebar-item ${activeTab === 'data' ? 'active' : ''}`}
        onClick={() => onTabChange('data')}
      >
        Data
      </button>
      <button
        className={`settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
        onClick={() => onTabChange('about')}
      >
        About
      </button>
    </div>
  );
};

export default SettingsSidebar;
