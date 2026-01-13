import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { TimeRange } from '../../../../../shared/consts';
import {
  USE_MOCK_DATA,
  formatTime,
  mockCategoryDataByRange,
  emptyCategoryData,
  categoryColors,
} from '../utils';

interface MapCategoriesChartProps {
  timeRange: TimeRange;
}

const MapCategoriesChart: React.FC<MapCategoriesChartProps> = ({
  timeRange,
}) => {
  const categoryData = USE_MOCK_DATA
    ? mockCategoryDataByRange[timeRange]
    : emptyCategoryData[timeRange];

  const chartData = useMemo(
    () => ({
      labels: categoryData.labels,
      datasets: [
        {
          data: categoryData.data,
          backgroundColor: categoryColors.colors,
          borderColor: categoryColors.borderColors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 4,
        },
      ],
    }),
    [categoryData]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
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
          displayColors: true,
          position: 'nearest' as const,
          xAlign: 'left' as const,
          yAlign: 'bottom' as const,
          caretSize: 6,
          callbacks: {
            label: (item: any) => {
              const mins = item.raw as number;
              const total = categoryData.data.reduce((a, b) => a + b, 0);
              const percentage =
                total > 0 ? Math.round((mins / total) * 100) : 0;
              return ` ${formatTime(mins)} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [categoryData]
  );

  const total = categoryData.data.reduce((a, b) => a + b, 0);
  const isEmpty = categoryData.data.length === 0;

  return (
    <div className="dashboard-chart-card">
      <div className="dashboard-chart-header">
        <div className="dashboard-chart-title">
          <span className="dashboard-chart-icon">🍩</span>
          <h3>Time by Category</h3>
        </div>
      </div>
      <div className="dashboard-doughnut-wrapper">
        {isEmpty ? (
          <div className="dashboard-empty-state">
            <span>No category data yet</span>
          </div>
        ) : (
          <>
            <div className="dashboard-doughnut-container">
              <Doughnut data={chartData} options={options} />
              <div className="dashboard-doughnut-center">
                <span className="dashboard-doughnut-total">
                  {formatTime(total)}
                </span>
                <span className="dashboard-doughnut-label">Total</span>
              </div>
            </div>
            <div className="dashboard-doughnut-legend">
              {categoryData.labels.map((label, index) => (
                <div key={label} className="dashboard-legend-item">
                  <span
                    className="dashboard-legend-color"
                    style={{ backgroundColor: categoryColors.colors[index] }}
                  />
                  <span className="dashboard-legend-label">{label}</span>
                  <span className="dashboard-legend-value">
                    {formatTime(categoryData.data[index])}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MapCategoriesChart;
