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
import { MessageChannel } from '../../../../main/services/MessageChannel';
import TimeRangeSelector from '../TopMaps/components/TimeRangeSelector';
import { DashboardProvider } from './DashboardContext';
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

interface DashboardsProps {
  messageChannel: MessageChannel;
}

const Dashboards: React.FC<DashboardsProps> = ({ messageChannel }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  return (
    <DashboardProvider messageChannel={messageChannel} timeRange={timeRange}>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Dashboard</h2>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
        <div className="dashboard-row-2col">
          <PlaytimeTrendChart />
          <MapCategoriesChart />
        </div>
        <div className="dashboard-row-2col">
          <WeekComparison />
          <RecentSessions />
        </div>
      </div>
    </DashboardProvider>
  );
};

export default Dashboards;
