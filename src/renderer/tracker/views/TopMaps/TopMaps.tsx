import React, { useEffect, useState } from 'react';
import {
  MessageChannel,
  MessageType,
  MessagePayload,
} from '../../../../main/services/MessageChannel';
import {
  kFortniteDeepLink,
  kWindowNames,
  MapData,
  TimeRange,
} from '../../../../shared/consts';
import { mockTopMapsByRange } from './utils/mockTopMaps';
import { createLogger } from '../../../../shared/services';
import { useLaunching } from '../../../contexts/LaunchingContext';
import TimeRangeSelector from './components/TimeRangeSelector';
import TableHeader from './components/TableHeader';
import TableRow from './components/TableRow';

/** Status of the data fetch operation */
type FetchStatus = 'loading' | 'success' | 'error';

/** Whether to use mock data (for development) */
const USE_MOCK_DATA = true;

const logger = createLogger('TopMapsPage');

interface TopMapsPageProps {
  messageChannel: MessageChannel;
}

const TopMapsPage: React.FC<TopMapsPageProps> = ({ messageChannel }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [maps, setMaps] = useState<MapData[]>([]);
  const [status, setStatus] = useState<FetchStatus>(
    USE_MOCK_DATA ? 'success' : 'loading'
  );
  const [error, setError] = useState<string | null>(null);
  const { launchMap } = useLaunching();

  // 1) Subscribe to updates
  useEffect(() => {
    const off = messageChannel.onMessage(
      MessageType.TOP_MAPS_UPDATED,
      (payload: MessagePayload) => {
        const range = payload.data?.range as TimeRange | undefined;
        const incoming = payload.data?.maps as MapData[] | undefined;

        if (!range || !Array.isArray(incoming)) {
          setStatus('error');
          setError('Invalid data received');
          return;
        }
        if (range !== timeRange) return;

        setMaps(incoming);
        setStatus('success');
        setError(null);
      }
    );

    return () => off();
  }, [messageChannel, timeRange]);

  // 2) Request whenever range changes (and on mount)
  useEffect(() => {
    if (USE_MOCK_DATA) return;

    setStatus('loading');
    setError(null);

    messageChannel.sendMessage(
      kWindowNames.background,
      MessageType.TOP_MAPS_REQUEST,
      { range: timeRange }
    );

    // Timeout fallback: if no response after 3s, show empty state
    // This handles cases where backend isn't responding
    const timeout = setTimeout(() => {
      setStatus((current) => {
        if (current === 'loading') {
          return 'success'; // Show empty state instead of infinite spinner
        }
        return current;
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [messageChannel, timeRange]);

  // Use mock data for development, real data for production
  const rows = USE_MOCK_DATA ? mockTopMapsByRange[timeRange] : maps;

  const handlePlayMap = (mapId: string) => {
    logger.log('Launching map:', mapId);
    launchMap(mapId);
  };

  return (
    <div className="topmaps-card">
      <div className="topmaps-header">
        <div>
          <div className="title">Top Played Maps</div>
          <div className="subtitle">
            Sorted by time played in selected range
          </div>
        </div>

        <div className="range-block">
          <div className="range-label">Time Played In</div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <TableHeader timeRange={timeRange} />

      {/* Loading State */}
      {status === 'loading' && (
        <div className="topmaps-status">
          <div className="topmaps-spinner" />
          <span>Loading maps...</span>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="topmaps-status topmaps-status--error">
          <span>⚠️ {error || 'Failed to load maps'}</span>
          <button
            className="retry-btn"
            onClick={() => {
              setStatus('loading');
              messageChannel.sendMessage(
                kWindowNames.background,
                MessageType.TOP_MAPS_REQUEST,
                { range: timeRange }
              );
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {status === 'success' && rows.length === 0 && (
        <div className="topmaps-status topmaps-status--empty">
          <span>🎮</span>
          <span>No maps played yet</span>
          <span className="topmaps-status-hint">
            Play some Creative maps and they'll show up here!
          </span>
        </div>
      )}

      {/* Data */}
      {status === 'success' &&
        rows.map((row) => (
          <TableRow
            key={row.map_id}
            map={row}
            timeRange={timeRange}
            onPlay={handlePlayMap}
          />
        ))}
    </div>
  );
};

export default TopMapsPage;
