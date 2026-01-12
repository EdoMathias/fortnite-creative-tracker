/**
 * @fileoverview Map Aggregation Utilities - Functions for aggregating map session data.
 * Transforms raw session data into aggregated statistics for the Top Maps view.
 */

import { MapSession } from "../../../../../shared/consts";
import { calculateTrendPercentage, getTrendDirection, formatTrendLabel } from "./trend";

// ============================================================================
// Constants
// ============================================================================

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of days for trend calculation */
const TREND_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

/** Aggregated statistics for a single map */
export interface MapAgg {
    /** Display title for the map */
    title: string;
    /** Unique map identifier (e.g., "1234-5678-9012") */
    map_id: string;
    /** Total time played in milliseconds */
    totalMs: number;
    /** Number of play sessions */
    sessions: number;
    /** Daily playtime for the last 7 days (for trend chart) */
    trendDailyMs7: number[];
}

/** Row data for the Top Maps table display */
export interface TopMapRow {
    rank: number;
    map_id: string;
    title: string;
    timePlayedMs: number;
    sessions: number;
    trendDailyMs7: number[];
    trendDirection: 'up' | 'down' | 'flat';
    trendLabel: string;
}

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Calculate the overlap between a session and a time range.
 * 
 * @param session - The map session to check
 * @param rangeStart - Start of the range in ms
 * @param rangeEnd - End of the range in ms
 * @returns Overlapping duration in milliseconds
 */
function overlapMs(session: MapSession, rangeStart: number, rangeEnd: number): number {
    const start = Math.max(session.startedAt, rangeStart);
    const end = Math.min(session.endedAt, rangeEnd);
    return Math.max(0, end - start);
}

/**
 * Get the timestamp for the start of a given day (midnight).
 * 
 * @param ts - Unix timestamp in ms
 * @returns Timestamp of midnight on that day
 */
function startOfDayMs(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/**
 * Build an array of daily start timestamps for the last N days.
 * 
 * @param days - Number of days to include
 * @param nowMs - Reference timestamp
 * @returns Array of timestamps (oldest to newest)
 */
function buildDailyStarts(days: number, nowMs = Date.now()): number[] {
    const today0 = startOfDayMs(nowMs);
    const out: number[] = [];
    // Build from oldest to newest
    for (let i = days - 1; i >= 0; i--) {
        out.push(today0 - i * MS_PER_DAY);
    }
    return out;
}

/**
 * Get the index into a daily array for a given timestamp.
 * 
 * @param dailyStarts - Array of daily start timestamps
 * @param ts - Timestamp to find index for
 * @returns Index into the array, or null if out of range
 */
function dayIndex(dailyStarts: number[], ts: number): number | null {
    const idx = Math.floor((startOfDayMs(ts) - dailyStarts[0]) / MS_PER_DAY);
    return idx >= 0 && idx < dailyStarts.length ? idx : null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Aggregate map sessions into per-map statistics.
 * 
 * Takes a list of sessions and aggregates them by map, calculating:
 * - Total time played in the range
 * - Number of sessions
 * - Daily playtime for the last 7 days (for trend visualization)
 * 
 * @param sessions - Array of map sessions to aggregate
 * @param rangeStartMs - Start of the filter range
 * @param rangeEndMs - End of the filter range
 * @param nowMs - Reference timestamp for trend calculation
 * @returns Array of aggregated map data
 * 
 * @example
 * ```ts
 * const aggs = aggregateMaps(sessions, weekAgoMs, nowMs);
 * // Returns: [{ map_id: "...", totalMs: 3600000, sessions: 2, ... }]
 * ```
 */
export function aggregateMaps(
    sessions: MapSession[],
    rangeStartMs: number,
    rangeEndMs: number,
    nowMs = Date.now()
): MapAgg[] {
    const byMap = new Map<string, MapAgg>();
    const dailyStarts7 = buildDailyStarts(TREND_DAYS, nowMs);

    for (const s of sessions) {
        // Calculate time played within the selected range
        const playedInRange = overlapMs(s, rangeStartMs, rangeEndMs);
        if (playedInRange <= 0) continue;

        // Get or create aggregation entry
        let agg = byMap.get(s.map_id);
        if (!agg) {
            agg = {
                title: "",
                map_id: s.map_id,
                totalMs: 0,
                sessions: 0,
                trendDailyMs7: Array(TREND_DAYS).fill(0),
            };
            byMap.set(s.map_id, agg);
        }

        agg.totalMs += playedInRange;
        agg.sessions += 1;

        // Calculate trend data (always last 7 days for momentum display)
        const trendStartMs = dailyStarts7[0];
        const trendEndMs = nowMs;

        // Distribute session time across days
        const effectiveStart = Math.max(s.startedAt, trendStartMs);
        const effectiveEnd = Math.min(s.endedAt, trendEndMs);
        if (effectiveEnd <= effectiveStart) continue;

        const startDay = startOfDayMs(effectiveStart);
        const endDay = startOfDayMs(effectiveEnd);

        for (let t = startDay; t <= endDay; t += MS_PER_DAY) {
            const idx = dayIndex(dailyStarts7, t);
            if (idx === null) continue;

            const dayRangeStart = t;
            const dayRangeEnd = t + MS_PER_DAY;
            const part = overlapMs(
                s,
                Math.max(trendStartMs, dayRangeStart),
                Math.min(trendEndMs, dayRangeEnd)
            );
            if (part > 0) agg.trendDailyMs7[idx] += part;
        }
    }

    return [...byMap.values()];
}

/**
 * Convert aggregated map data to table row format.
 * 
 * Sorts maps by time played and adds rank, trend direction, and labels.
 * 
 * @param aggs - Array of aggregated map data
 * @param metaByCode - Map of metadata by map code (for titles)
 * @returns Array of rows ready for table display
 * 
 * @example
 * ```ts
 * const rows = toTopRows(aggs, { "1234-5678": { title: "Box Fights" } });
 * // Returns: [{ rank: 1, title: "Box Fights", trendDirection: "up", ... }]
 * ```
 */
export function toTopRows(
    aggs: MapAgg[],
    metaByCode: Record<string, { title: string }>
): TopMapRow[] {
    // Sort by time played (descending)
    const sorted = [...aggs].sort((a, b) => b.totalMs - a.totalMs);

    return sorted.map((a, i) => {
        const pct = calculateTrendPercentage(a.trendDailyMs7);
        const dir = getTrendDirection(pct, a.trendDailyMs7);
        const label = formatTrendLabel(a.trendDailyMs7);

        return {
            rank: i + 1,
            map_id: a.map_id,
            title: metaByCode[a.map_id]?.title ?? a.title,
            timePlayedMs: a.totalMs,
            sessions: a.sessions,
            trendDailyMs7: a.trendDailyMs7,
            trendDirection: dir,
            trendLabel: label,
        };
    });
}
