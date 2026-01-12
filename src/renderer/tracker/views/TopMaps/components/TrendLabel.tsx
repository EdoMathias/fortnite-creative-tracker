import React from "react";
import { calculateTrendPercentage, formatTrendLabel } from "../utils/trend";

interface TrendLabelProps {
    days: number[];
}

const TrendLabel: React.FC<TrendLabelProps> = ({ days }) => {
    const pct = calculateTrendPercentage(days);
    const label = formatTrendLabel(days);
    const direction = pct === null ? '' : pct >= 0 ? 'up' : 'down';

    return (
        <span className={`trend-label ${direction}`}>
            {label}
        </span>
    );
};

export default TrendLabel;