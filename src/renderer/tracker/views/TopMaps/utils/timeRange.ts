/**
 * @fileoverview Time Range Utilities - Functions for calculating date ranges.
 * Used to filter map session data by time period.
 */

import { TimeRange } from "../../../../../shared/consts";

// ============================================================================
// Constants
// ============================================================================

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

/** Result of a time range calculation */
export interface TimeRangeMs {
    /** Start timestamp in milliseconds */
    startMs: number;
    /** End timestamp in milliseconds */
    endMs: number;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Convert a TimeRange value to start and end timestamps.
 * 
 * @param range - The time range to convert ("today", "7d", "30d", "all")
 * @param nowMs - Reference timestamp (defaults to current time)
 * @returns Object with startMs and endMs timestamps
 * 
 * @example
 * ```ts
 * const { startMs, endMs } = getRangeMs("7d");
 * // startMs = 7 days ago
 * // endMs = now
 * 
 * const todayRange = getRangeMs("today");
 * // startMs = midnight today
 * // endMs = now
 * ```
 */
export function getRangeMs(range: TimeRange, nowMs = Date.now()): TimeRangeMs {
    switch (range) {
        case "today": {
            const d = new Date(nowMs);
            d.setHours(0, 0, 0, 0);
            return { startMs: d.getTime(), endMs: nowMs };
        }
        case "7d":
            return { startMs: nowMs - 7 * MS_PER_DAY, endMs: nowMs };

        case "30d":
            return { startMs: nowMs - 30 * MS_PER_DAY, endMs: nowMs };

        case "all":
            return { startMs: 0, endMs: nowMs };
    }
}

/**
 * Get a human-readable label for a time range.
 * 
 * @param range - The time range
 * @returns Display label string
 * 
 * @example
 * getTimeRangeLabel("7d")  // "Last 7 Days"
 * getTimeRangeLabel("all") // "All Time"
 */
export function getTimeRangeLabel(range: TimeRange): string {
    const labels: Record<TimeRange, string> = {
        today: "Today",
        "7d": "Last 7 Days",
        "30d": "Last 30 Days",
        all: "All Time",
    };
    return labels[range];
}
