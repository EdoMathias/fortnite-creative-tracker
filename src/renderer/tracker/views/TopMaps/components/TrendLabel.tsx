import React from "react";

interface TrendLabelProps {
    days: number[];
}

const TrendLabel: React.FC<TrendLabelProps> = ({ days }) => {

    function trendPctFrom7(days: number[]): number | null {
        const first = days[0];
        const last = days[days.length - 1];
        if (first <= 0 && last <= 0) return null;
        if (first <= 0) return null; // treat as NEW in UI
        return ((last - first) / first) * 100;
    }

    const pct = trendPctFrom7(days);

    if (pct === null) {
        const isNew = days[0] === 0 && days[days.length - 1] > 0;
        return <span className="trend-label">{isNew ? "NEW" : "—"}</span>;
    }

    const rounded = Math.round(pct);
    return (
        <span className={`trend-label ${rounded >= 0 ? "up" : "down"}`}>
            {rounded > 0 ? "+" : ""}{rounded}%
        </span>
    );
};

export default TrendLabel;