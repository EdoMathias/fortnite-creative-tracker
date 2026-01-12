import React from 'react';
import { TimeRange } from '../../../../../shared/consts';

interface TableHeaderProps {
    timeRange: TimeRange;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
    today: 'TODAY',
    '7d': '7 DAYS',
    '30d': '30 DAYS',
    all: 'ALL TIME',
};

const TableHeader: React.FC<TableHeaderProps> = ({ timeRange }) => {
    return (
        <div className="maps-grid maps-grid--header">
            <div>RANK</div>
            <div>MAP</div>
            <div>TIME PLAYED</div>
            <div>TREND ({TIME_RANGE_LABELS[timeRange]})</div>
            <div className="col-action">ACTION</div>
        </div>
    );
};

export default TableHeader;