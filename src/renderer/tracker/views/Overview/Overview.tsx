import React from 'react';
import { useMapsData } from '../../../hooks/useMapsData';
import { useOverviewStats } from '../../../hooks/useOverviewStats';
import { useTopMaps } from '../../../hooks/useTopMaps';
import { useLaunching } from '../../../contexts/LaunchingContext';
import { MessageChannel } from '../../../../main/services/MessageChannel';
import { StatsRow, HeroMapGallery, RecentMapsTile } from './components';

interface OverviewProps {
  messageChannel: MessageChannel;
}

const Overview: React.FC<OverviewProps> = ({ messageChannel }) => {
  const { recentMaps } = useMapsData();
  const { stats } = useOverviewStats(messageChannel);
  const { topMaps } = useTopMaps(messageChannel);
  const { launchMap } = useLaunching();

  // Display the default Battle Royale map if no top maps are available
  const fallbackBRMap = {
    id: 'br_main',
    name: 'Battle Royale',
    plays: 0,
    // thumbnail: '/assets/br_main_thumb.jpg', // ensure asset exists
    description: 'Default Battle Royale island — featured until you play maps',
    isFallback: true,
  };

  const displayedTopMaps = (topMaps) ? topMaps : [fallbackBRMap];

  return (
    <div className="overview-container">
      {/* Row 1: Stats tiles */}
      <StatsRow
        totalPlaytime={stats.totalPlaytime}
        mapsPlayed={stats.mapsPlayed}
        avgSession={stats.avgSession}
      />

      {/* Row 2: Top played map rotating gallery */}
      <HeroMapGallery topMaps={topMaps} onLaunch={launchMap} />

      {/* Row 3: Recent maps */}
      <RecentMapsTile maps={recentMaps ?? []} />
    </div>
  );
};

export default Overview;
