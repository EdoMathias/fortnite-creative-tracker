/**
 * @fileoverview Top Maps Facade - High-level API for retrieving top played maps data.
 * Aggregates session data from the store and transforms it into display-ready format.
 */

import { topMapsStore } from "./top-maps.store";
import type { TimeRange, MapData, TrendDirection } from "../../../shared/consts";
import {
    startOfDay,
    dayKey,
    lastNDaysKeys,
    MS_PER_DAY,
    MS_PER_MINUTE,
} from "../../../shared/utils/dateUtils";

// ============================================================================
// Types
// ============================================================================

/** Metadata for a map that can be resolved externally */
export type MapMeta = {
    title?: string;
    thumbnail?: string;
};

/** Function type for resolving map metadata by map ID */
export type MapMetaResolver = (map_id: string) => MapMeta | undefined;

// ============================================================================
// Constants
// ============================================================================

/** Threshold for trend direction change (2 minutes in ms) */
const TREND_DEADZONE_MS = 2 * MS_PER_MINUTE;

/** Number of days for trend calculation */
const TREND_DAYS = 7;

/**
 * Get the start timestamp for a given time range.
 * @param range - The time range to calculate from
 * @param now - Reference timestamp (defaults to current time)
 * @returns Unix timestamp for the start of the range
 */
function rangeStartTs(range: TimeRange, now = Date.now()): number {
    const today0 = startOfDay(now);
    switch (range) {
        case "today":
            return today0;
        case "7d":
            return today0 - 6 * MS_PER_DAY;
        case "30d":
            return today0 - 29 * MS_PER_DAY;
        case "all":
            return 0;
    }
}

// ============================================================================
// Trend Calculations
// ============================================================================

/**
 * Determine the trend direction from daily play time data.
 * Uses a deadzone to avoid flickering on small changes.
 * 
 * @param days - Array of daily playtime values in ms
 * @returns Trend direction: "up", "down", or "flat"
 */
function trendDirectionFrom7(days: number[]): TrendDirection {
    const first = days[0] ?? 0;
    const last = days[days.length - 1] ?? 0;

    const delta = last - first;
    if (Math.abs(delta) < TREND_DEADZONE_MS) return "flat";
    return delta > 0 ? "up" : "down";
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the top played maps for a given time range.
 * 
 * Aggregates play time data from the store, calculates trends,
 * and returns a sorted list of maps ready for display.
 * 
 * @param range - The time range to filter by ("today", "7d", "30d", "all")
 * @param resolveMeta - Optional function to resolve map metadata (title, thumbnail)
 * @returns Array of MapData sorted by time played (descending)
 * 
 * @example
 * ```ts
 * const maps = getTopMaps("7d", (id) => mapMetaCache.get(id));
 * console.log(maps[0].title, maps[0].timePlayed); // "Box Fights" "14h 30m"
 * ```
 */
export function getTopMaps(range: TimeRange, resolveMeta?: MapMetaResolver): MapData[] {
    const store = topMapsStore.read();
    const now = Date.now();

    const fromTs = rangeStartTs(range, now);
    const keys = Object.keys(store.dailyTotals);

    // Aggregate totals per map for the selected range
    const totals = new Map<string, number>();
    const playCount = new Map<string, number>();
    const lastPlayedByMap = new Map<string, string>();

    for (const k of keys) {
        const ts = new Date(k).getTime();
        if (!Number.isFinite(ts) || ts < fromTs) continue;

        const maps = store.dailyTotals[k];
        for (const map_id of Object.keys(maps)) {
            const ms = maps[map_id] ?? 0;
            totals.set(map_id, (totals.get(map_id) ?? 0) + ms);

            // Count days played (rough play count)
            if (ms > 0) {
                playCount.set(map_id, (playCount.get(map_id) ?? 0) + 1);
                lastPlayedByMap.set(map_id, k);
            }
        }
    }

    // Build trend arrays (always last 7 days for momentum display)
    const trendKeys = lastNDaysKeys(TREND_DAYS, now);
    const trendByMap = new Map<string, number[]>();

    for (const map_id of totals.keys()) {
        const arr = trendKeys.map(k => store.dailyTotals[k]?.[map_id] ?? 0);
        trendByMap.set(map_id, arr);
    }

    // Sort maps by total time played (descending)
    const sorted = [...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([map_id, totalMs]) => ({ map_id, totalMs }));

    // Transform to MapData format
    const rows: MapData[] = sorted.map((item, idx) => {
        // First try external resolver, then fallback to store's map metadata
        const externalMeta = resolveMeta?.(item.map_id);
        const storedMeta = store.maps?.[item.map_id];
        
        const title = externalMeta?.title ?? storedMeta?.title;
        const thumbnail = externalMeta?.thumbnail ?? storedMeta?.thumbnail;
        
        const trend = trendByMap.get(item.map_id) ?? Array(TREND_DAYS).fill(0);

        return {
            map_id: item.map_id,
            title,
            thumbnail,
            rank: idx + 1,
            timePlayedMs: item.totalMs,
            trend,
            trendDirection: trendDirectionFrom7(trend),
            playCount: playCount.get(item.map_id),
            lastPlayed: lastPlayedByMap.get(item.map_id),
        };
    });

    return rows;
}
