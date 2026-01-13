import React from 'react';

interface StatTileProps {
  icon: string;
  value: string | number;
  label: string;
}

const StatTile: React.FC<StatTileProps> = ({ icon, value, label }) => {
  return (
    <div className="overview-tile overview-tile-stat">
      <div className="overview-tile-icon">{icon}</div>
      <div className="overview-tile-value">{value}</div>
      <div className="overview-tile-label">{label}</div>
    </div>
  );
};

export default StatTile;
