import React, { useState, useEffect } from 'react';
import { MapData, ActiveSession } from '../../../../../shared/consts';

interface RecentMapsWidgetProps {
  recentMaps: MapData[];
  activeSession: ActiveSession | null;
}

// Helper function to format seconds into "Xm Ys" or "Xh Ym"
const formatElapsedTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const RecentMapsWidget: React.FC<RecentMapsWidgetProps> = ({ 
  recentMaps, 
  activeSession 
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer - only runs when there's an active session
  useEffect(() => {
    if (!activeSession?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      return Math.floor((Date.now() - activeSession.startedAt) / 1000);
    };

    setElapsedSeconds(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.startedAt]);

  // Sort maps by lastPlayed (most recent first)
  const sortedRecentMaps = [...recentMaps].sort((a, b) => 
    new Date(b.lastPlayed ?? 0).getTime() - new Date(a.lastPlayed ?? 0).getTime()
  );

  return (
    <div className="widget recent-maps-widget">
      <div className="widget-header">
        <h3>🕒 Recent Maps</h3>
      </div>
      <div className="widget-content">
        {sortedRecentMaps.length === 0 ? (
          <div className="widget-empty-state">No recent maps played yet</div>
        ) : (
          <div className="recent-maps-list">
            {sortedRecentMaps.slice(0, 5).map((map) => {
              const isCurrentlyPlaying = activeSession?.map_id === map.map_id;
              
              return (
                <div 
                  key={map.map_id} 
                  className={`recent-map-item ${isCurrentlyPlaying ? 'active' : ''}`}
                >
                  <div className="recent-map-info">
                    <div className="recent-map-name">
                      {map.title || map.map_id}
                    </div>
                    <div className="recent-map-time">
                      {isCurrentlyPlaying ? (
                        <span className="recent-map-live">
                          🟢 {formatElapsedTime(elapsedSeconds)}
                        </span>
                      ) : (
                        <span className="recent-map-total">
                          {map.timePlayed || 'No time recorded'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentMapsWidget;