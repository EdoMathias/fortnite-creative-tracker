import React from 'react';

interface MapInfoProps {
    title: string;
    map_id: string;
}

const MapInfo: React.FC<MapInfoProps> = ({ title, map_id }) => {
    return (
        <div className="map-info">
            <span className="map-name">{title}</span>
            <span className="map-code">{map_id}</span>
        </div>
    );
};

export default MapInfo;