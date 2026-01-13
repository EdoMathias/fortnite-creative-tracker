import React from 'react';
import MapCard from '../../../../components/MapCard';
import { MapData } from '../../../../../shared/consts';

interface RecentMapsTileProps {
  maps: MapData[];
}

const RecentMapsEmptyState: React.FC = () => (
  <div className="overview-map-empty">
    <span className="overview-map-empty-icon">🕐</span>
    <span className="overview-map-empty-text">No recent maps</span>
    <span className="overview-map-empty-hint">
      Your recently played maps will show up here
    </span>
  </div>
);

const RecentMapsTile: React.FC<RecentMapsTileProps> = ({ maps }) => {
  const hasRecentMaps = maps && maps.length > 0;

  return (
    <div className="overview-tile overview-tile-wide">
      <div className="overview-tile-header">
        <h3>🕐 Recent Maps</h3>
      </div>
      <div className="overview-maps-list">
        {hasRecentMaps ? (
          <div className="overview-map-item">
            {maps.map((map: MapData) => (
              <MapCard key={map.map_id} map={map} />
            ))}
          </div>
        ) : (
          <RecentMapsEmptyState />
        )}
      </div>
    </div>
  );
};

export default RecentMapsTile;
