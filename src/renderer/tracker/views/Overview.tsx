import React from 'react';
import MapCard from '../../components/MapCard';
import { MapData } from '../../../shared/consts';
import { useMapsData } from '../../hooks/useMapsData';
import { useLaunching } from '../../contexts/LaunchingContext';

const Overview = () => {
  const { topMaps, recentMaps } = useMapsData();
  const { launchMap } = useLaunching();

  const topMap = topMaps && topMaps.length > 0 ? topMaps[0] : null;

  return (
    <div className="overview-container">
      {/* Row 1: Stats tiles */}
      <div className="overview-stats-row">
        <div className="overview-tile overview-tile-stat">
          <div className="overview-tile-icon">⏱️</div>
          <div className="overview-tile-value">--:--</div>
          <div className="overview-tile-label">Total Playtime</div>
        </div>
        <div className="overview-tile overview-tile-stat">
          <div className="overview-tile-icon">🗺️</div>
          <div className="overview-tile-value">
            {recentMaps && recentMaps.length > 0 ? recentMaps.length : '0'}
          </div>
          <div className="overview-tile-label">Maps Played</div>
        </div>
        <div className="overview-tile overview-tile-stat">
          <div className="overview-tile-icon">📊</div>
          <div className="overview-tile-value">--:--</div>
          <div className="overview-tile-label">Avg Session</div>
        </div>
      </div>

      {/* Row 2: Top played maps */}
      <div className="overview-tile overview-tile-wide overview-hero-tile">
        <div className="overview-tile-header">
          <h3>🏆 Top Played Map this week</h3>
        </div>
        {topMap ? (
          <div
            className="overview-hero-map"
            style={{
              backgroundImage: topMap.thumbnail
                ? `url(${topMap.thumbnail})`
                : 'none',
            }}
          >
            <div className="overview-hero-content">
              <h2 className="overview-hero-title">{topMap.title}</h2>
              <div className="overview-hero-meta">
                <span className="overview-hero-code">{topMap.map_id}</span>
                <span className="overview-hero-label">
                  • Most Played This Week
                </span>
              </div>
              <button
                className="overview-hero-launch"
                onClick={() => {
                  if (topMap) {
                    launchMap(topMap.map_id);
                  }
                }}
              >
                ▶ LAUNCH MAP
              </button>
            </div>
          </div>
        ) : (
          <div className="overview-map-empty">
            <span className="overview-map-empty-text">No map data yet</span>
          </div>
        )}
      </div>

      {/* Row 2: Recent maps */}
      <div className="overview-tile overview-tile-wide">
        <div className="overview-tile-header">
          <h3>🕐 Recent Maps</h3>
        </div>
        <div className="overview-maps-list">
          {recentMaps && recentMaps.length > 0 ? (
            <div className="overview-map-item">
              {recentMaps.map((map: MapData) => (
                <MapCard key={map.map_id} map={map} />
              ))}
            </div>
          ) : (
            <div className="overview-map-empty">
              <span className="overview-map-empty-text">No recent maps</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
