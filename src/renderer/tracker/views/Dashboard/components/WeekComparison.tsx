import React from 'react';
import { TimeRange } from '../../../../../shared/consts';
import {
  USE_MOCK_DATA,
  formatTime,
  mockComparisonByRange,
  emptyComparison,
} from '../utils';

interface WeekComparisonProps {
  timeRange: TimeRange;
}

const WeekComparison: React.FC<WeekComparisonProps> = ({ timeRange }) => {
  const comparisonData = USE_MOCK_DATA
    ? mockComparisonByRange[timeRange]
    : emptyComparison[timeRange];
  const { current, previous, currentLabel, previousLabel } = comparisonData;

  // Handle "all" time range where there's no previous period
  const hasPreviousData = previous.total > 0;

  const totalChange = hasPreviousData
    ? ((current.total - previous.total) / previous.total) * 100
    : 0;
  const sessionsChange = hasPreviousData
    ? ((current.sessions - previous.sessions) / previous.sessions) * 100
    : 0;
  const avgChange = hasPreviousData
    ? ((current.avgSession - previous.avgSession) / previous.avgSession) * 100
    : 0;

  const getChangeClass = (change: number) =>
    !hasPreviousData
      ? 'neutral'
      : change > 0
      ? 'positive'
      : change < 0
      ? 'negative'
      : 'neutral';
  const getChangeIcon = (change: number) =>
    !hasPreviousData ? '—' : change > 0 ? '↗' : change < 0 ? '↘' : '→';

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-header">
        <div className="dashboard-chart-title">
          <span className="dashboard-chart-icon">📊</span>
          <h3>
            {hasPreviousData
              ? `${currentLabel} vs ${previousLabel}`
              : currentLabel}
          </h3>
        </div>
      </div>
      <div className="week-comparison-content">
        <div className="week-comparison-row">
          <div className="week-comparison-metric">
            <span className="week-comparison-label">Total Playtime</span>
            <div className="week-comparison-values">
              <span className="week-comparison-current">
                {formatTime(current.total)}
              </span>
              {hasPreviousData && (
                <span className="week-comparison-previous">
                  vs {formatTime(previous.total)}
                </span>
              )}
            </div>
          </div>
          <div
            className={`week-comparison-change ${getChangeClass(totalChange)}`}
          >
            <span className="change-icon">{getChangeIcon(totalChange)}</span>
            {hasPreviousData && (
              <span className="change-value">
                {Math.abs(Math.round(totalChange))}%
              </span>
            )}
          </div>
        </div>

        <div className="week-comparison-row">
          <div className="week-comparison-metric">
            <span className="week-comparison-label">Sessions</span>
            <div className="week-comparison-values">
              <span className="week-comparison-current">
                {current.sessions}
              </span>
              {hasPreviousData && (
                <span className="week-comparison-previous">
                  vs {previous.sessions}
                </span>
              )}
            </div>
          </div>
          <div
            className={`week-comparison-change ${getChangeClass(
              sessionsChange
            )}`}
          >
            <span className="change-icon">{getChangeIcon(sessionsChange)}</span>
            {hasPreviousData && (
              <span className="change-value">
                {Math.abs(Math.round(sessionsChange))}%
              </span>
            )}
          </div>
        </div>

        <div className="week-comparison-row">
          <div className="week-comparison-metric">
            <span className="week-comparison-label">Avg Session</span>
            <div className="week-comparison-values">
              <span className="week-comparison-current">
                {formatTime(current.avgSession)}
              </span>
              {hasPreviousData && (
                <span className="week-comparison-previous">
                  vs {formatTime(previous.avgSession)}
                </span>
              )}
            </div>
          </div>
          <div
            className={`week-comparison-change ${getChangeClass(avgChange)}`}
          >
            <span className="change-icon">{getChangeIcon(avgChange)}</span>
            {hasPreviousData && (
              <span className="change-value">
                {Math.abs(Math.round(avgChange))}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekComparison;
