import React, { useMemo } from "react";

interface TrendChartProps {
    data: number[]; // 7 daily values (ms or minutes)
    minBarPct?: number; // to avoid invisible bars
}

const TrendChart: React.FC<TrendChartProps> = ({ data, minBarPct = 12 }) => {
    const bars = useMemo(() => {
        const max = Math.max(...data, 1);
        return data.map(v => {
            const pct = (v / max) * 100;
            return Math.max(pct, minBarPct);
        });
    }, [data, minBarPct]);

    return (
        <div className="trend-chart">
            {bars.map((h, i) => (
                <div key={i} className="trend-bar" style={{ height: `${h}%` }} />
            ))}
        </div>
    );
};

export default TrendChart;