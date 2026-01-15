import React, { useState, useEffect } from 'react';
import { gameTimeService, GameTimeStats } from '../../../shared/services/GameTimeService';

interface GameEventKey {
  name: string;
  type: number;
  state: number;
  is_index: boolean;
  category: string | null;
  sample_data: any;
  published: boolean;
  is_vgep: boolean;
}

interface GameEventFeature {
  name: string;
  state: number;
  published: boolean;
  keys: GameEventKey[];
}

interface GameEventsStatus {
  game_id: number;
  state: number;
  disabled: boolean;
  published: boolean;
  is_vgep: boolean;
  features: GameEventFeature[];
  vgep_prefix: string | null;
  min_gep_version: string | null;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

const getStatusColor = (state: number): string => {
  switch (state) {
    case 0:
      return '#808080'; // unsupported - gray
    case 1:
      return '#22c55e'; // green - Good to go
    case 2:
      return '#eab308'; // yellow - Partial functionality
    case 3:
      return '#ef4444'; // red - Game events are unavailable
    default:
      return '#808080';
  }
};

const getStatusTooltip = (state: number): string => {
  switch (state) {
    case 0:
      return 'Game events: Unsupported';
    case 1:
      return 'Game events: Good to go';
    case 2:
      return 'Game events: Partial functionality, some game events may be unavailable';
    case 3:
      return 'Game events: Unavailable';
    default:
      return 'Game events: Unknown status';
  }
};

export const GameTimeWidget: React.FC = () => {
  const [stats, setStats] = useState<GameTimeStats>({
    inMapTime: 0,
    lobbyTime: 0,
    totalTime: 0,
    mapsPlayed: 0,
    sessionMapsPlayed: 0,
    currentScene: undefined,
    currentTime: 0,
    avgMapTime: 0,
    avgDowntime: 0
  });

  const [gameEventsState, setGameEventsState] = useState<number | null>(null);

  useEffect(() => {
    const fetchGameEventsStatus = async () => {
      try {
        const response = await fetch('https://game-events-status.overwolf.com/27168_prod.json');
        const data: GameEventsStatus = await response.json();
        
        // Find the worst state among all keys in all features
        let worstState = 1; // Default to good
        data.features.forEach(feature => {
          feature.keys.forEach(key => {
            if (key.state > worstState) {
              worstState = key.state;
            }
          });
        });
        
        setGameEventsState(worstState);
      } catch (error) {
        console.error('Failed to fetch game events status:', error);
        setGameEventsState(null);
      }
    };

    fetchGameEventsStatus();
    // Refresh status every 5 minutes
    const statusInterval = setInterval(fetchGameEventsStatus, 5 * 60 * 1000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    const updateStats = () => {
      // Reload data from localStorage to get latest session info from background window
      gameTimeService.reloadData();
      setStats(gameTimeService.getGameTimeStats());
    };

    // Load initial data
    updateStats();

    // Listen for changes
    const handleChange = () => {
      gameTimeService.reloadData();
      updateStats();
    };
    window.addEventListener('gameTimeChanged', handleChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'fortnite_tracker_game_time') {
        gameTimeService.reloadData();
        updateStats();
      }
    });

    // Update every second to show live time (reloads data each time to get latest session)
    const interval = setInterval(updateStats, 1000);

    return () => {
      window.removeEventListener('gameTimeChanged', handleChange);
      clearInterval(interval);
    };
  }, []);

  const inMapPercentage = stats.totalTime > 0 
    ? Math.round((stats.inMapTime / stats.totalTime) * 100) 
    : 0;
  const lobbyPercentage = stats.totalTime > 0 
    ? Math.round((stats.lobbyTime / stats.totalTime) * 100) 
    : 0;

  return (
    <div className="widget game-time-widget">
      <div className="widget-header">
        <h3>Game Time</h3>
        <div className="widget-header-right">
          {gameEventsState !== null && (
            <div className="widget-header-tooltip">
              <div 
                className="game-events-indicator"
                style={{ 
                  backgroundColor: getStatusColor(gameEventsState)
                }}
              />
              <div className="widget-tooltip-content">
                {getStatusTooltip(gameEventsState)}
              </div>
            </div>
          )}
          <div className="widget-header-tooltip">
            <span className="widget-tooltip-icon">ℹ️</span>
            <div className="widget-tooltip-content">
              This widget relies on Overwolf Game events, and can sometimes display inaccurate results
            </div>
          </div>
        </div>
      </div>
      <div className="widget-content">
        <div className="game-time-raids-counter">
          <div className="game-time-raids-row">
            <div className="game-time-raids-item">
              <div className="game-time-raids-label">Total Maps Played</div>
              <div className="game-time-raids-value">{stats.mapsPlayed}</div>
            </div>
            <div className="game-time-raids-item">
              <div className="game-time-raids-label">Maps played this session</div>
              <div className="game-time-raids-value">{stats.sessionMapsPlayed}</div>
            </div>
          </div>
        </div>
        {stats.mapsPlayed > 0 && (
          <div className="game-time-averages">
            <div className="game-time-avg-item">
              <span className="game-time-avg-label">Avg Map Time:</span>
              <span className="game-time-avg-value">{formatTime(stats.avgMapTime)}</span>
            </div>
            <div className="game-time-avg-separator">|</div>
            <div className="game-time-avg-item">
              <span className="game-time-avg-label">Avg Downtime:</span>
              <span className="game-time-avg-value">{formatTime(stats.avgDowntime)}</span>
            </div>
          </div>
        )}
        <div className="game-time-stats">
          <div className="game-time-stat">
            <div className="game-time-label">Total In-Map</div>
            <div className="game-time-value">{formatTime(stats.inMapTime)}</div>
            <div className="game-time-percentage">{inMapPercentage}%</div>
          </div>
          <div className="game-time-stat">
            <div className="game-time-label">Total In Lobby</div>
            <div className="game-time-value">{formatTime(stats.lobbyTime)}</div>
            <div className="game-time-percentage">{lobbyPercentage}%</div>
          </div>
        </div>
        <div className="game-time-summary">
          <div className="game-time-stat">
            <div className="game-time-label">
              {stats.currentScene ? 'Current' : 'Awaiting game'}
            </div>
            <div className="game-time-value">
              {formatTime(stats.currentScene ? stats.currentTime : 0)}
            </div>
            <div className="game-time-percentage">
              {stats.currentScene ? `In ${stats.currentScene === 'inMap' ? 'Map' : 'Lobby'}` : 'Not in-game'}
            </div>
          </div>
          <div className="game-time-stat">
            <div className="game-time-label">Total Played Time</div>
            <div className="game-time-value">{formatTime(stats.totalTime)}</div>
          </div>
        </div>
        {stats.totalTime > 0 && (
          <>
            <div className="game-time-ratio-bar">
              <div 
                className="game-time-ratio-bar-raid" 
                style={{ width: `${inMapPercentage}%` }}
                title={`In-Map: ${inMapPercentage}%`}
              />
              <div 
                className="game-time-ratio-bar-lobby" 
                style={{ width: `${lobbyPercentage}%` }}
                title={`Lobby: ${lobbyPercentage}%`}
              />
            </div>
            <div className="game-time-ratio-legend">
              <div className="game-time-legend-item">
                <div className="game-time-legend-color game-time-legend-color-raid"></div>
                <span className="game-time-legend-label">In-Map</span>
              </div>
              <div className="game-time-legend-item">
                <div className="game-time-legend-color game-time-legend-color-lobby"></div>
                <span className="game-time-legend-label">Lobby</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

