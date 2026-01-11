import React from 'react';
import { MapData } from '../../../../../shared/consts';
import RankBadge from './RankBadge';
import MapInfo from './MapInfo';
import TrendChart from './TrendChart';
import TrendArrow from './TrendArrow';
import TrendLabel from './TrendLabel';

interface TableRowProps {
    map: MapData;
}

const TableRow: React.FC<TableRowProps> = ({ map }) => {
    return (
        <div className="maps-grid maps-grid--row">
            <div><RankBadge rank={map.rank} /></div>
            <div><MapInfo title={map.title} map_id={map.map_id} /></div>
            <div className="col-time">
                <span className="time-value">{map.timePlayed}</span>
                {/* optional: sessions */}
                {/* <span className="time-sub">{map.sessions} sessions</span> */}
            </div>
            <div className="col-trend">
                <TrendChart data={map.trend} />
                <TrendLabel days={map.trend} />
            </div>
            <div className="col-action">
                <TrendArrow direction={map.trendDirection} />
            </div>
        </div>
    );
};

export default TableRow;