import React from 'react';
import StatTile from './StatTile';

interface StatsRowProps {
  totalPlaytime: string;
  mapsPlayed: number;
  avgSession: string;
}

const StatsRow: React.FC<StatsRowProps> = ({
  totalPlaytime,
  mapsPlayed,
  avgSession,
}) => {
  return (
    <div className="overview-stats-row">
      <StatTile icon="⏱️" value={totalPlaytime} label="Total Playtime" />
      <StatTile icon="🗺️" value={mapsPlayed} label="Maps Played" />
      <StatTile icon="📊" value={avgSession} label="Avg Session" />
    </div>
  );
};

export default StatsRow;
