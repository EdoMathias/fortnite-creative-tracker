import React from 'react';
import { useMapsData } from '../../../hooks/useMapsData';
import { useOverviewStats } from '../../../hooks/useOverviewStats';
import { useTopMap } from '../../../hooks/useTopMap';
import { useLaunching } from '../../../contexts/LaunchingContext';
import { MessageChannel } from '../../../../main/services/MessageChannel';
import { StatsRow, HeroMapTile, RecentMapsTile } from './components';

interface OverviewProps {
  messageChannel: MessageChannel;
}

const Overview: React.FC<OverviewProps> = ({ messageChannel }) => {
  const { recentMaps } = useMapsData();
  const { stats } = useOverviewStats(messageChannel);
  const { topMap } = useTopMap(messageChannel);
  const { launchMap } = useLaunching();

  return (
    <div className="overview-container">
      {/* Row 1: Stats tiles */}
      <StatsRow
        totalPlaytime={stats.totalPlaytime}
        mapsPlayed={stats.mapsPlayed}
        avgSession={stats.avgSession}
      />

      {/* Row 2: Top played map hero */}
      <HeroMapTile map={topMap} onLaunch={launchMap} />

      {/* Row 3: Recent maps */}
      <RecentMapsTile maps={recentMaps ?? []} />
    </div>
  );
};

export default Overview;
