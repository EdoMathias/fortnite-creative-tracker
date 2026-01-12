import React from 'react';
import { createLogger } from '../../shared/services/Logger';
import { useLaunching } from '../contexts/LaunchingContext';

const logger = createLogger('MapCard');

const MapCard: React.FC<{ map: any }> = ({ map }) => {
  const { launchMap } = useLaunching();

  const handleLaunchMap = (mapId: string) => {
    logger.log('Launching map:', mapId);
    launchMap(mapId);
  };

  const getMapThumbnail = (mapId: string) => {
    return `https://creativemaps.net/api/v1/maps/${mapId}/thumbnail`;
  };

  return (
    <div className="map-card">
      <div className="map-card-thumbnail">
        <img src={map.thumbnail} alt={map.name} />
      </div>
      <div className="map-card-name">{map.title}</div>
      <div className="map-card-code">{map.map_id}</div>
      <div className="map-card-code">
        <button
          className="launch-map-button"
          onClick={() => {
            handleLaunchMap(map.map_id);
          }}
        >
          Launch Map
        </button>
      </div>
    </div>
  );
};

export default MapCard;
