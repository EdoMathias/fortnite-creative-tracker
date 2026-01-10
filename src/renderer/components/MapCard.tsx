import React from 'react';
import { createLogger } from '../../shared/services/Logger';
import { kBaseCreativeMapsUrl } from '../../shared/consts';

const logger = createLogger('MapCard');

const MapCard: React.FC<{ map: any }> = ({ map }) => {
    const launchMap = (mapId: string) => {
        logger.log('Launching map:', mapId);
        // overwolf.utils.openUrlInDefaultBrowser(`${kBaseCreativeMapsUrl}/${mapId}`);
        window.open(`${kBaseCreativeMapsUrl}/${mapId}`, '_blank');
    };

    const getMapThumbnail = (mapId: string) => {
        return `https://creativemaps.net/api/v1/maps/${mapId}/thumbnail`;
    };


    return (
        <div className="map-card">
            <div className="map-card-thumbnail">
                <img src={map.thumbnail} alt={map.name} />
            </div>
            <div className="map-card-name">
                {map.title}
            </div>
            <div className="map-card-code">
                {map.map_id}
            </div>
            <div className="map-card-code">
                <button className="launch-map-button" onClick={() => {
                    launchMap(map.map_id);
                }}>Launch Map</button>
            </div>
        </div>
    );
};

export default MapCard;