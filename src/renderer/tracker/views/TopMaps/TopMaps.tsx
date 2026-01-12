import React, { useEffect, useState } from 'react';
import {
  MessageChannel,
  MessageType,
  MessagePayload,
} from '../../../../main/services/MessageChannel';
import { kWindowNames, mockTopMaps, MapData, TimeRange } from '../../../../shared/consts';

import TimeRangeSelector from './components/TimeRangeSelector';
import TrendMini from './components/TrendMini';
import { mockTopMapsByRange } from './utils/mockTopMaps';

export function TopMapsPage({
  messageChannel,
}: {
  messageChannel: MessageChannel;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  // const [maps, setMaps] = useState<MapData[]>([]);

  // Mock data
  const [maps, setMaps] = useState<MapData[]>(mockTopMaps as MapData[]);

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

  // 3) (Optional) if you want stable rendering order just trust rank; maps already sorted by facade
  // const rows = useMemo(() => maps, [maps]);
  const rows = mockTopMapsByRange[timeRange];

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

      <div className="maps-grid maps-grid--header">
        <div>RANK</div>
        <div>MAP</div>
        <div>TIME PLAYED</div>
        <div>TREND {timeRange}</div>
        <div className="col-action">ACTION</div>
      </div>

      {rows.map((r) => (
        <div key={r.map_id} className="maps-grid maps-grid--row">
          <div className="col-rank">#{r.rank}</div>

          <div className="col-map">
            <div className="map-title">{r.title ?? r.map_id}</div>
            <div className="map-code">{r.map_id}</div>
          </div>

          <div className="col-time">
            <div className="time-value">{r.timePlayed}</div>
            {/* If you want sessions/playCount, add it to facade output and show here */}
            {/* <div className="time-sub">{r.playCount ?? 0} sessions</div> */}
          </div>

          <div className="col-trend">
            <TrendMini
              dailyMs7={r.trend}
              label={undefined as any}
              direction={r.trendDirection}
              timeRange={timeRange}
            />
          </div>

          <div className="col-action">
            <button className="play-btn">Play</button>
          </div>
        </div>
      ))}
    </div>
  );
}
