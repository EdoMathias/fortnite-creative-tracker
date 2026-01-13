import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { TimeRange } from '../../../../../shared/consts';
import {
  USE_MOCK_DATA,
  mockPlaytimeDataByRange,
  emptyPlaytimeData,
} from '../utils';

interface PlaytimeTrendChartProps {
  timeRange: TimeRange;
}

const PlaytimeTrendChart: React.FC<PlaytimeTrendChartProps> = ({
  timeRange,
}) => {
  const playtimeData = USE_MOCK_DATA
    ? mockPlaytimeDataByRange[timeRange]
    : emptyPlaytimeData[timeRange];

  const chartData = useMemo(
    () => ({
      labels: playtimeData.labels,
      datasets: [
        {
          label: 'Playtime',
          data: playtimeData.data,
          borderColor: 'rgba(52, 211, 153, 1)',
          backgroundColor: 'rgba(52, 211, 153, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(52, 211, 153, 1)',
          pointBorderColor: '#161925',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(52, 211, 153, 1)',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    }),
    [playtimeData]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(22, 25, 37, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(52, 211, 153, 0.5)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items: any[]) => items[0]?.label || '',
            label: (item: any) => {
              const mins = item.raw as number;
              const hours = Math.floor(mins / 60);
              const remainingMins = mins % 60;
              return hours > 0
                ? `${hours}h ${remainingMins}m played`
                : `${mins}m played`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.6)',
            font: {
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.6)',
            font: {
              size: 11,
            },
            callback: (value: number | string) => {
              const numValue =
                typeof value === 'string' ? parseFloat(value) : value;
              if (numValue >= 60) {
                return `${Math.floor(numValue / 60)}h`;
              }
              return `${numValue}m`;
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    }),
    []
  );

  // Calculate total and average
  const totalMins = playtimeData.data.reduce((a, b) => a + b, 0);
  const avgMins =
    playtimeData.data.length > 0
      ? Math.round(totalMins / playtimeData.data.length)
      : 0;
  const totalHours = Math.floor(totalMins / 60);
  const totalRemainingMins = totalMins % 60;

  const titleByRange: Record<TimeRange, string> = {
    today: 'Playtime Today',
    '7d': 'Playtime This Week',
    '30d': 'Playtime This Month',
    all: 'All Time Playtime',
  };

  const avgLabelByRange: Record<TimeRange, string> = {
    today: 'Hourly Avg',
    '7d': 'Daily Avg',
    '30d': 'Weekly Avg',
    all: 'Monthly Avg',
  };

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-header">
        <div className="dashboard-chart-title">
          <span className="dashboard-chart-icon">📈</span>
          <h3>{titleByRange[timeRange]}</h3>
        </div>
        <div className="dashboard-chart-stats">
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">
              {totalHours}h {totalRemainingMins}m
            </span>
            <span className="dashboard-stat-label">Total</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">
              {Math.floor(avgMins / 60)}h {avgMins % 60}m
            </span>
            <span className="dashboard-stat-label">
              {avgLabelByRange[timeRange]}
            </span>
          </div>
        </div>
      </div>
      <div className="dashboard-chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default PlaytimeTrendChart;
