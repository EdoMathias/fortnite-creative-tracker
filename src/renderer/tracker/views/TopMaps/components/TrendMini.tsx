import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

import { TimeRange, TrendDirection } from '../../../../../shared/consts';

interface TrendMiniProps {
  dailyMs7: number[];
  direction: TrendDirection;
  timeRange?: TimeRange;
  label?: string;
}

// Generate appropriate labels based on time range
function generateLabels(dataLength: number, timeRange: TimeRange): string[] {
  switch (timeRange) {
    case 'today':
      // 24 hours: 12 AM, 1 AM, ..., 11 PM
      return Array.from({ length: dataLength }, (_, i) => {
        const hour = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return `${hour} ${ampm}`;
      });
    case '7d':
      // Last 7 days
      return Array.from({ length: dataLength }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (dataLength - 1 - i));
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      });
    case '30d':
      // Last 30 days
      return Array.from({ length: dataLength }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (dataLength - 1 - i));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      });
    case 'all':
      // Monthly (last 12 months)
      return Array.from({ length: dataLength }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (dataLength - 1 - i));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
      });
    default:
      return Array.from({ length: dataLength }, (_, i) => `Point ${i + 1}`);
  }
}

const TrendMini: React.FC<TrendMiniProps> = ({
  dailyMs7,
  label,
  direction,
  timeRange = '7d',
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const colors = useMemo(() => {
    switch (direction) {
      case 'up':
        return {
          line: 'rgba(45, 244, 167, 1)',
          fill: 'rgba(45, 244, 167, 0.2)',
        };
      case 'down':
        return {
          line: 'rgba(255, 91, 122, 1)',
          fill: 'rgba(255, 91, 122, 0.2)',
        };
      default:
        return {
          line: 'rgba(86, 177, 255, 1)',
          fill: 'rgba(86, 177, 255, 0.2)',
        };
    }
  }, [direction]);

  const data = useMemo(() => {
    const labels = generateLabels(dailyMs7.length, timeRange);
    return {
      labels,
      datasets: [
        {
          data: dailyMs7,
          borderColor: colors.line,
          backgroundColor: colors.fill,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: colors.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [dailyMs7, colors, timeRange]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(30, 30, 46, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: colors.line,
          borderWidth: 1,
          padding: 8,
          displayColors: false,
          callbacks: {
            title: (items: any[]) => items[0]?.label || '',
            label: (item: any) => `${item.raw} mins`,
          },
        },
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    }),
    [colors]
  );

  return (
    <div className="trend-mini">
      <div className="trend-line-chart">
        <Line ref={chartRef} data={data} options={options} />
      </div>

      <div className={`trend-meta ${direction}`}>
        <span className="trend-label">{label}</span>
        <span className="trend-arrow">
          {direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→'}
        </span>
      </div>
    </div>
  );
};

export default TrendMini;
