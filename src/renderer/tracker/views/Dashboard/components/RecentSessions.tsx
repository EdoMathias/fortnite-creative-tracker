import React from 'react';
import { TimeRange } from '../../../../../shared/consts';
import {
  USE_MOCK_DATA,
  formatTime,
  mockRecentSessionsByRange,
  emptyRecentSessions,
} from '../utils';

interface RecentSessionsProps {
  timeRange: TimeRange;
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ timeRange }) => {
  const recentSessions = USE_MOCK_DATA
    ? mockRecentSessionsByRange[timeRange]
    : emptyRecentSessions[timeRange];

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-header">
        <div className="dashboard-chart-title">
          <span className="dashboard-chart-icon">🕐</span>
          <h3>Recent Sessions</h3>
        </div>
      </div>
      <div className="recent-sessions-list">
        {recentSessions.length === 0 ? (
          <div className="recent-sessions-empty">
            <span>No sessions recorded yet</span>
          </div>
        ) : (
          recentSessions.map((session, index) => (
            <div key={index} className="recent-session-item">
              <div className="recent-session-info">
                <span className="recent-session-map">{session.map}</span>
                <span className="recent-session-code">{session.code}</span>
              </div>
              <div className="recent-session-meta">
                <span className="recent-session-duration">
                  {formatTime(session.duration)}
                </span>
                <span className="recent-session-time">{session.timeAgo}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentSessions;
