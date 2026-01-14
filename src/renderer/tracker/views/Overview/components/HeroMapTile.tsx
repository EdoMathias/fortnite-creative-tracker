import React from 'react';
import { MapData } from '../../../../../shared/consts';

interface HeroMapTileProps {
  map: MapData | null;
  onLaunch: (mapId: string) => void;
}

const HeroMapEmptyState: React.FC = () => (
  <div className="overview-map-empty">
    <span className="overview-map-empty-icon">🎮</span>
    <span className="overview-map-empty-text">No map data yet</span>
    <span className="overview-map-empty-hint">
      Play some Creative maps and your top map will appear here!
    </span>
  </div>
);

const HeroMapTile: React.FC<HeroMapTileProps> = ({ map, onLaunch }) => {
  return (
    <div className="overview-tile overview-tile-wide overview-hero-tile">
      <div className="overview-tile-header">
        <h3>🏆 Top Played Map this week</h3>
      </div>
      {map ? (
        <div
          className="overview-hero-map"
          style={{
            backgroundImage: map.thumbnail ? `url(${map.thumbnail})` : 'none',
          }}
        >
          <div className="overview-hero-content">
            <h2 className="overview-hero-title">{map.title || map.map_id}</h2>
            <div className="overview-hero-meta">
              <span className="overview-hero-code">{map.map_id}</span>
              <span className="overview-hero-time">{map.timePlayed}</span>
              <span className="overview-hero-label">• Most Played This Week</span>
            </div>
            <button
              className="overview-hero-launch"
              onClick={() => onLaunch(map.map_id)}
            >
              ▶ LAUNCH MAP
            </button>
          </div>
        </div>
      ) : (
        <HeroMapEmptyState />
      )}
    </div>
  );
};

export default HeroMapTile;
