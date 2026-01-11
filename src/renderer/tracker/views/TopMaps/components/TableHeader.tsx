import React from 'react';

const TableHeader: React.FC = () => {
    return (
        <div className="maps-grid maps-grid--header">
            <div>RANK</div>
            <div>MAP</div>
            <div>TIME PLAYED</div>
            <div>TREND (7 DAYS)</div>
            <div className="col-action">ACTION</div>
        </div>
    );
};

export default TableHeader;