import React from 'react';
import { useMapsData } from '../../../hooks/useMapsData';
import { useLaunching } from '../../../contexts/LaunchingContext';
import { StatsRow, HeroMapTile, RecentMapsTile } from './components';

const Overview: React.FC = () => {
  const { topMaps, recentMaps } = useMapsData();
  const { launchMap } = useLaunching();

  const topMap = topMaps && topMaps.length > 0 ? topMaps[0] : null;
  const mapsPlayedCount = recentMaps?.length ?? 0;

  // TODO: Replace with actual data from tracking service
  const totalPlaytime = '--:--';
  const avgSession = '--:--';

  return (
    <div className="overview-container">
      {/* Row 1: Stats tiles */}
      <StatsRow
        totalPlaytime={totalPlaytime}
        mapsPlayed={mapsPlayedCount}
        avgSession={avgSession}
      />

      {/* Row 2: Top played map hero */}
      <HeroMapTile map={topMap} onLaunch={launchMap} />

      {/* Row 3: Recent maps */}
      <RecentMapsTile maps={recentMaps ?? []} />
    </div>
  );
};

export default Overview;
