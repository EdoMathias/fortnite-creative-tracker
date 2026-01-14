/**
 * @fileoverview Dashboard Data Facade - Aggregates data for dashboard views.
 * Provides playtime trends, category breakdowns, comparisons, and recent sessions.
 */

import { topMapsStore } from "./top-maps.store";
import type { TimeRange } from "../../../shared/consts";
import {
    startOfDay,
    dayKey,
    lastNDaysKeys,
    formatDuration,
    MS_PER_DAY,
    MS_PER_HOUR,
} from "../../../shared/utils/dateUtils";

// ============================================================================
// Types
// ============================================================================

/** Playtime trend data for charts */
export interface PlaytimeTrendData {
    labels: string[];
    /** Minutes played per period */
    data: number[];
}

/** Category breakdown data */
export interface CategoryData {
    labels: string[];
    /** Minutes per category */
    data: number[];
}

/** Period comparison data */
export interface ComparisonData {
    current: {
        total: number;      // minutes
        sessions: number;
        avgSession: number; // minutes
    };
    previous: {
        total: number;
        sessions: number;
        avgSession: number;
    };
    currentLabel: string;
    previousLabel: string;
}

/** Recent session entry */
export interface RecentSession {
    map: string;
    code: string;
    duration: number;  // minutes
    timeAgo: string;
}

/** Top 5 maps data */
export interface Top5MapEntry {
    name: string;
    code: string;
    minutes: number;
}

/** Complete dashboard data for a time range */
export interface DashboardData {
    playtimeTrend: PlaytimeTrendData;
    categoryData: CategoryData;
    comparison: ComparisonData;
    recentSessions: RecentSession[];
    top5Maps: Top5MapEntry[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert milliseconds to minutes
 */
function msToMinutes(ms: number): number {
    return Math.round(ms / 60000);
}

/**
 * Get time range boundaries
 */
function getTimeRangeBoundaries(range: TimeRange, now = Date.now()): { start: number; end: number } {
    const today0 = startOfDay(now);
    
    switch (range) {
        case "today":
            return { start: today0, end: now };
        case "7d":
            return { start: today0 - 6 * MS_PER_DAY, end: now };
        case "30d":
            return { start: today0 - 29 * MS_PER_DAY, end: now };
        case "all":
            return { start: 0, end: now };
    }
}

/**
 * Get previous period boundaries for comparison
 */
function getPreviousPeriodBoundaries(range: TimeRange, now = Date.now()): { start: number; end: number } | null {
    const today0 = startOfDay(now);
    
    switch (range) {
        case "today":
            // Yesterday
            return { start: today0 - MS_PER_DAY, end: today0 };
        case "7d":
            // Previous 7 days
            return { start: today0 - 13 * MS_PER_DAY, end: today0 - 6 * MS_PER_DAY };
        case "30d":
            // Previous 30 days
            return { start: today0 - 59 * MS_PER_DAY, end: today0 - 29 * MS_PER_DAY };
        case "all":
            // No previous period for "all time"
            return null;
    }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(timestamp: number, now = Date.now()): string {
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
    if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    if (minutes > 0) return minutes === 1 ? "1 min ago" : `${minutes} mins ago`;
    return "Just now";
}

/**
 * Get day labels for a time range
 */
function getLabelsForRange(range: TimeRange, now = Date.now()): string[] {
    const today = new Date(now);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    switch (range) {
        case "today": {
            // Hour labels: 6am, 9am, 12pm, etc.
            return ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];
        }
        case "7d": {
            // Last 7 days with day names
            const labels: string[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now - i * MS_PER_DAY);
                labels.push(dayNames[d.getDay()]);
            }
            return labels;
        }
        case "30d": {
            // Weekly labels
            return ["Week 1", "Week 2", "Week 3", "Week 4"];
        }
        case "all": {
            // Monthly labels (last 4 months)
            const labels: string[] = [];
            for (let i = 3; i >= 0; i--) {
                const d = new Date(now);
                d.setMonth(d.getMonth() - i);
                labels.push(monthNames[d.getMonth()]);
            }
            return labels;
        }
    }
}

// ============================================================================
// Data Aggregation
// ============================================================================

/**
 * Get playtime trend data for a time range
 */
export function getPlaytimeTrend(range: TimeRange): PlaytimeTrendData {
    const store = topMapsStore.read();
    const now = Date.now();
    const labels = getLabelsForRange(range, now);
    
    switch (range) {
        case "today": {
            // Aggregate by 3-hour blocks (6am-9am, 9am-12pm, etc.)
            // For now, simplified: just show daily total spread across hours
            const todayKey = dayKey(now);
            const dayData = store.dailyTotals[todayKey] ?? {};
            const totalMs = Object.values(dayData).reduce((sum, ms) => sum + ms, 0);
            const totalMins = msToMinutes(totalMs);
            
            // Distribute roughly across time slots based on current hour
            const currentHour = new Date(now).getHours();
            const data = labels.map((_, idx) => {
                const slotStart = 6 + idx * 3;
                if (currentHour >= slotStart) {
                    return Math.round(totalMins / (idx + 1));
                }
                return 0;
            });
            
            return { labels, data };
        }
        case "7d": {
            // Get data for last 7 days
            const keys = lastNDaysKeys(7, now);
            const data = keys.map(k => {
                const dayData = store.dailyTotals[k] ?? {};
                const totalMs = Object.values(dayData).reduce((sum, ms) => sum + ms, 0);
                return msToMinutes(totalMs);
            });
            return { labels, data };
        }
        case "30d": {
            // Aggregate by week
            const data: number[] = [0, 0, 0, 0];
            const today0 = startOfDay(now);
            
            for (let i = 0; i < 30; i++) {
                const dateKey = dayKey(today0 - i * MS_PER_DAY);
                const dayData = store.dailyTotals[dateKey] ?? {};
                const totalMs = Object.values(dayData).reduce((sum, ms) => sum + ms, 0);
                const weekIdx = Math.min(3, Math.floor(i / 7));
                data[3 - weekIdx] += msToMinutes(totalMs);
            }
            
            return { labels, data };
        }
        case "all": {
            // Aggregate by month (last 4 months)
            const data: number[] = [0, 0, 0, 0];
            const allKeys = Object.keys(store.dailyTotals);
            
            for (const k of allKeys) {
                const ts = new Date(k).getTime();
                if (!Number.isFinite(ts)) continue;
                
                const monthsAgo = Math.floor((now - ts) / (30 * MS_PER_DAY));
                if (monthsAgo < 4) {
                    const dayData = store.dailyTotals[k] ?? {};
                    const totalMs = Object.values(dayData).reduce((sum, ms) => sum + ms, 0);
                    data[3 - monthsAgo] += msToMinutes(totalMs);
                }
            }
            
            return { labels, data };
        }
    }
}

/**
 * Get category breakdown data
 * Note: Since we don't have category metadata, we group by map for now
 */
export function getCategoryData(range: TimeRange): CategoryData {
    const store = topMapsStore.read();
    const now = Date.now();
    const { start } = getTimeRangeBoundaries(range, now);
    
    // Aggregate time by map
    const mapTotals = new Map<string, number>();
    
    for (const [dateKey, dayData] of Object.entries(store.dailyTotals)) {
        const ts = new Date(dateKey).getTime();
        if (!Number.isFinite(ts) || ts < start) continue;
        
        for (const [mapId, ms] of Object.entries(dayData)) {
            mapTotals.set(mapId, (mapTotals.get(mapId) ?? 0) + ms);
        }
    }
    
    // Get top 5 maps as "categories" for now
    const sorted = [...mapTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const labels = sorted.map(([mapId]) => mapId.substring(0, 14)); // Truncate map IDs
    const data = sorted.map(([, ms]) => msToMinutes(ms));
    
    // If we have more than 5, add "Other"
    if (mapTotals.size > 5) {
        const top5Total = sorted.reduce((sum, [, ms]) => sum + ms, 0);
        const allTotal = [...mapTotals.values()].reduce((sum, ms) => sum + ms, 0);
        const otherMs = allTotal - top5Total;
        if (otherMs > 0) {
            labels.push("Other");
            data.push(msToMinutes(otherMs));
        }
    }
    
    return { labels, data };
}

/**
 * Get comparison data between current and previous period
 */
export function getComparisonData(range: TimeRange): ComparisonData {
    const store = topMapsStore.read();
    const now = Date.now();
    
    const current = getTimeRangeBoundaries(range, now);
    const previous = getPreviousPeriodBoundaries(range, now);
    
    // Calculate current period stats
    const currentStats = calculatePeriodStats(store.dailyTotals, store.sessions, current.start, current.end);
    
    // Calculate previous period stats (if available)
    const previousStats = previous 
        ? calculatePeriodStats(store.dailyTotals, store.sessions, previous.start, previous.end)
        : { total: 0, sessions: 0, avgSession: 0 };
    
    const periodLabels = getPeriodLabels(range);
    
    return {
        current: currentStats,
        previous: previousStats,
        currentLabel: periodLabels.current,
        previousLabel: periodLabels.previous,
    };
}

/**
 * Calculate stats for a time period
 */
function calculatePeriodStats(
    dailyTotals: Record<string, Record<string, number>>,
    sessions: Array<{ map_id: string; startedAt: number; endedAt: number }>,
    start: number,
    end: number
): { total: number; sessions: number; avgSession: number } {
    let totalMs = 0;
    
    for (const [dateKey, dayData] of Object.entries(dailyTotals)) {
        const ts = new Date(dateKey).getTime();
        if (!Number.isFinite(ts) || ts < start || ts > end) continue;
        
        for (const ms of Object.values(dayData)) {
            totalMs += ms;
        }
    }
    
    // Count sessions in range
    const sessionsInRange = sessions.filter(
        s => s.startedAt >= start && s.startedAt <= end
    ).length;
    
    const totalMins = msToMinutes(totalMs);
    const avgMins = sessionsInRange > 0 ? Math.round(totalMins / sessionsInRange) : 0;
    
    return {
        total: totalMins,
        sessions: sessionsInRange,
        avgSession: avgMins,
    };
}

/**
 * Get period labels for comparison
 */
function getPeriodLabels(range: TimeRange): { current: string; previous: string } {
    switch (range) {
        case "today":
            return { current: "Today", previous: "Yesterday" };
        case "7d":
            return { current: "This Week", previous: "Last Week" };
        case "30d":
            return { current: "This Month", previous: "Last Month" };
        case "all":
            return { current: "All Time", previous: "N/A" };
    }
}

/**
 * Get recent sessions for a time range
 */
export function getRecentSessions(range: TimeRange, limit = 10): RecentSession[] {
    const store = topMapsStore.read();
    const now = Date.now();
    const { start } = getTimeRangeBoundaries(range, now);
    
    // Get sessions in range, sorted by most recent
    const sessionsInRange = store.sessions
        .filter(s => s.startedAt >= start)
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, limit);
    
    return sessionsInRange.map(s => {
        // Look up map metadata for title
        const mapMeta = store.maps?.[s.map_id];
        
        return {
            map: mapMeta?.title ?? s.map_id, // Use title if available, fallback to map_id
            code: s.map_id,
            duration: msToMinutes(s.endedAt - s.startedAt),
            timeAgo: formatTimeAgo(s.endedAt, now),
        };
    });
}

/**
 * Get top 5 most played maps for a time range
 */
export function getTop5Maps(range: TimeRange): Top5MapEntry[] {
    const store = topMapsStore.read();
    const now = Date.now();
    const { start } = getTimeRangeBoundaries(range, now);
    
    // Aggregate time by map
    const mapTotals = new Map<string, number>();
    
    for (const [dateKey, dayData] of Object.entries(store.dailyTotals)) {
        const ts = new Date(dateKey).getTime();
        if (!Number.isFinite(ts) || ts < start) continue;
        
        for (const [mapId, ms] of Object.entries(dayData)) {
            mapTotals.set(mapId, (mapTotals.get(mapId) ?? 0) + ms);
        }
    }
    
    // Sort and get top 5
    return [...mapTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([mapId, ms]) => {
            // Look up map metadata for title
            const mapMeta = store.maps?.[mapId];
            
            return {
                name: mapMeta?.title ?? mapId, // Use title if available, fallback to map_id
                code: mapId,
                minutes: msToMinutes(ms),
            };
        });
}

/**
 * Get all dashboard data for a time range
 */
export function getDashboardData(range: TimeRange): DashboardData {
    return {
        playtimeTrend: getPlaytimeTrend(range),
        categoryData: getCategoryData(range),
        comparison: getComparisonData(range),
        recentSessions: getRecentSessions(range),
        top5Maps: getTop5Maps(range),
    };
}

/**
 * Get library data (all maps ever played)
 */
export function getLibraryData(): Array<{
    map_id: string;
    title?: string;
    totalPlayTime: number;
    playCount: number;
    lastPlayed: number;
    firstPlayed: number;
}> {
    const store = topMapsStore.read();
    const now = Date.now();
    
    // Aggregate total time per map from daily totals
    const mapStats = new Map<string, {
        totalMs: number;
        playCount: number;
        lastPlayed: number;
        firstPlayed: number;
    }>();
    
    // First, count actual sessions per map (most accurate play count)
    for (const session of store.sessions) {
        const existing = mapStats.get(session.map_id) ?? {
            totalMs: 0,
            playCount: 0,
            lastPlayed: 0,
            firstPlayed: Infinity,
        };
        
        existing.playCount++;
        existing.lastPlayed = Math.max(existing.lastPlayed, session.endedAt);
        existing.firstPlayed = Math.min(existing.firstPlayed, session.startedAt);
        
        mapStats.set(session.map_id, existing);
    }
    
    // Process daily totals for total time (and catch maps not in sessions)
    for (const [dateKey, dayData] of Object.entries(store.dailyTotals)) {
        const ts = new Date(dateKey).getTime();
        if (!Number.isFinite(ts)) continue;
        
        for (const [mapId, ms] of Object.entries(dayData)) {
            const existing = mapStats.get(mapId) ?? {
                totalMs: 0,
                playCount: 0,
                lastPlayed: 0,
                firstPlayed: Infinity,
            };
            
            existing.totalMs += ms;
            
            // If no sessions recorded, use day timestamp as approximation
            if (existing.lastPlayed === 0) {
                existing.lastPlayed = ts + MS_PER_DAY - 1; // End of that day
            }
            if (existing.firstPlayed === Infinity) {
                existing.firstPlayed = ts;
            }
            // If map has no sessions but has daily totals, count days played
            if (existing.playCount === 0 && ms > 0) {
                existing.playCount = 1; // At least 1 session
            }
            
            mapStats.set(mapId, existing);
        }
    }
    
    // Convert to array and sort by total time
    return [...mapStats.entries()]
        .map(([map_id, stats]) => {
            // Look up map metadata for title
            const mapMeta = store.maps?.[map_id];
            
            return {
                map_id,
                title: mapMeta?.title, // Use stored title if available
                totalPlayTime: stats.totalMs,
                playCount: Math.max(1, stats.playCount), // Ensure at least 1 if played
                lastPlayed: stats.lastPlayed || now,
                firstPlayed: stats.firstPlayed === Infinity ? now : stats.firstPlayed,
            };
        })
        .sort((a, b) => b.totalPlayTime - a.totalPlayTime);
}

/**
 * Get overview statistics
 */
export function getOverviewStats(): {
    totalPlaytimeMs: number;
    mapsPlayed: number;
    avgSessionMs: number;
} {
    const store = topMapsStore.read();
    
    // Calculate total playtime
    let totalMs = 0;
    const mapsPlayed = new Set<string>();
    
    for (const dayData of Object.values(store.dailyTotals)) {
        for (const [mapId, ms] of Object.entries(dayData)) {
            totalMs += ms;
            mapsPlayed.add(mapId);
        }
    }
    
    // Calculate average session time
    const sessionCount = store.sessions.length;
    const avgSessionMs = sessionCount > 0 ? Math.round(totalMs / sessionCount) : 0;
    
    return {
        totalPlaytimeMs: totalMs,
        mapsPlayed: mapsPlayed.size,
        avgSessionMs,
    };
}
