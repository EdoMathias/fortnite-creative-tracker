import React, { useEffect, useState } from 'react';
import {
  MessageChannel,
  MessageType,
  MessagePayload,
} from '../../../../main/services/MessageChannel';
import { kWindowNames, MapData, TimeRange } from '../../../../shared/consts';

import TableHeader from './components/TableHeader';
import TableRow from './components/TableRow';
import TimeRangeSelector from './components/TimeRangeSelector';
import { mockTopMapsByRange } from './utils/mockTopMaps';

export function TopMapsPage({
  messageChannel,
}: {
  messageChannel: MessageChannel;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [maps, setMaps] = useState<MapData[]>([]);

  // 1) Subscribe to updates
  useEffect(() => {
    const off = messageChannel.onMessage(
      MessageType.TOP_MAPS_UPDATED,
      (payload: MessagePayload) => {
        const range = payload.data?.range as TimeRange | undefined;
        const incoming = payload.data?.maps as MapData[] | undefined;

        if (!range || !Array.isArray(incoming)) return;
        if (range !== timeRange) return;

        setMaps(incoming);
      }
    );

    return () => off();
  }, [messageChannel, timeRange]);

  // 2) Request whenever range changes (and on mount)
  useEffect(() => {
    messageChannel.sendMessage(
      kWindowNames.background,
      MessageType.TOP_MAPS_REQUEST,
      { range: timeRange }
    );
  }, [messageChannel, timeRange]);

  // TODO: Switch to real data once backend is ready
  // const rows = maps;
  const rows = mockTopMapsByRange[timeRange];

  const handlePlayMap = (mapId: string) => {
    // TODO: Implement play functionality
    console.log('Play map:', mapId);
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

      {rows.map((row) => (
        <TableRow
          key={row.map_id}
          map={row}
          timeRange={timeRange}
          onPlay={handlePlayMap}
        />
      ))}
    </div>
  );
}
