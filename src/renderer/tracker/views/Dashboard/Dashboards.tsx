import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

import { TimeRange } from '../../../../shared/consts';
import TimeRangeSelector from '../TopMaps/components/TimeRangeSelector';
import {
  PlaytimeTrendChart,
  MapCategoriesChart,
  WeekComparison,
  RecentSessions,
} from './components';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
  Legend
);

const Dashboards: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="dashboard-row-2col">
        <PlaytimeTrendChart timeRange={timeRange} />
        <MapCategoriesChart timeRange={timeRange} />
      </div>
      <div className="dashboard-row-2col">
        <WeekComparison timeRange={timeRange} />
        <RecentSessions timeRange={timeRange} />
      </div>
    </div>
  );
};

export default Dashboards;
