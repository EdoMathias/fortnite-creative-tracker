import React from 'react';

const AboutSettings: React.FC = () => {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">About Fortnite Map Tracker</h3>
      <p className="settings-section-description">
        Fortnite Map Tracker is an unofficial tracker for Fortnite Creative, designed to help you track 
        previously played maps and modes and how long you've spent in each.
      </p>

      <div className="settings-about-copyright">
        <p className="settings-copyright-text">
          "Fortnite® is a registered trademark of Epic Games, Inc. This application is a fan-made project 
          and is not affiliated with, endorsed, or sponsored by Epic Games, Inc."
        </p>
      </div>
    </div>
  );
};

export default AboutSettings;
