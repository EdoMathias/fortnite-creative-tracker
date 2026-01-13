import React from 'react';
import { LibraryMapData } from '../types';
import { formatPlayTime, formatRelativeTime } from '../utils';

interface LibraryRowProps {
  map: LibraryMapData;
  onToggleFavorite: (mapId: string) => void;
  onPlay: (mapId: string) => void;
}

const LibraryRow: React.FC<LibraryRowProps> = ({
  map,
  onToggleFavorite,
  onPlay,
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(map.map_id);
  };

  const handlePlayClick = () => {
    onPlay(map.map_id);
  };

  return (
    <div className="library-row">
      <button
        className={`library-favorite-btn ${map.isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        title={map.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={map.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {map.isFavorite ? '⭐' : '☆'}
      </button>

      <div className="library-map-info">
        <span className="library-map-title">{map.title ?? 'Unknown Map'}</span>
        <span className="library-map-code">{map.map_id}</span>
      </div>

      <div className="library-stat library-stat-playtime">
        <span className="library-stat-value">{formatPlayTime(map.totalPlayTime)}</span>
        <span className="library-stat-label">Total Time</span>
      </div>

      <div className="library-stat library-stat-playcount">
        <span className="library-stat-value">{map.playCount}</span>
        <span className="library-stat-label">Sessions</span>
      </div>

      <div className="library-stat library-stat-lastplayed">
        <span className="library-stat-value">{formatRelativeTime(map.lastPlayed)}</span>
        <span className="library-stat-label">Last Played</span>
      </div>

      <div className="library-actions">
        <button className="library-play-btn" onClick={handlePlayClick}>
          Play
        </button>
      </div>
    </div>
  );
};

export default LibraryRow;
