import React, { useEffect } from 'react';
import { MapData, TimeRange } from '../../../../../shared/consts';
import RankBadge from './RankBadge';
import MapInfo from './MapInfo';
import TrendMini from './TrendMini';

interface TableRowProps {
    map: MapData;
    timeRange: TimeRange;
    onPlay?: (mapId: string) => void;
}

const TableRow: React.FC<TableRowProps> = ({ map, timeRange, onPlay }) => {
    const handlePlay = () => {
        onPlay?.(map.map_id);
    };

    return (
        <div className="maps-grid maps-grid--row">
            <div><RankBadge rank={map.rank} /></div>
            <div><MapInfo title={map.title} map_id={map.map_id} /></div>
            <div className="col-time">
                <span className="time-value">{map.timePlayed}</span>
            </div>
            <div className="col-trend">
                <TrendMini
                    dailyMs7={map.trend}
                    direction={map.trendDirection}
                    timeRange={timeRange}
                />
            </div>
            <div className="col-action">
                <button className="play-btn" onClick={handlePlay}>Play</button>
            </div>
        </div>
    );
};

export default TableRow;