import React from "react";
import type { TimeRange } from "../../../../../shared/consts";

const OPTIONS: { key: TimeRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
    { key: "all", label: "All Time" },
];

interface TimeRangeSelectorProps {
    value: TimeRange;
    onChange: (v: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
    value,
    onChange,
}) => {
    return (
        <div className="range-selector" role="tablist" aria-label="Time range">
            {OPTIONS.map(o => (
                <button
                    key={o.key}
                    type="button"
                    className={`range-btn ${value === o.key ? "active" : ""}`}
                    onClick={() => onChange(o.key)}
                    role="tab"
                    aria-selected={value === o.key}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
};

export default TimeRangeSelector;