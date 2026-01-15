import React from 'react';
import { createLogger } from '../../shared/services/Logger';
import { useLaunching } from '../contexts/LaunchingContext';
import { MapData } from '../../shared/consts';
import { formatPlayTime } from '../../shared/utils/timeFormat';

const logger = createLogger('MapCard');

interface MapCardProps {
  map: MapData;
}

const MapCard: React.FC<MapCardProps> = ({ map }) => {
  const { launchMap } = useLaunching();

  return (
    <div className="map-card">
      <div
        className="map-card-thumbnail"
        style={{
          backgroundImage: map.thumbnail ? `url(${map.thumbnail})` : 'none',
        }}
      >
        {!map.thumbnail && <div className="map-card-thumbnail-placeholder" />}
      </div>
      <div className="map-card-content">
        <h4 className="map-card-title" title={map.title || map.map_id}>
          {map.title || map.map_id}
        </h4>
        <span className="map-card-code">{map.map_id}</span>
        {typeof map.timePlayedMs === 'number' && (
          <span className="map-card-time">{formatPlayTime(map.timePlayedMs)}</span>
        )}
        <button
          className="map-card-launch"
          onClick={() => launchMap(map.map_id)}
        >
          Launch Map
        </button>
      </div>
    </div>
  );
};

export default MapCard;
