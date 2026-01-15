/**
 * @fileoverview Date Utilities - Shared functions for date/time operations.
 * Used across main process and renderer for consistent date handling.
 */

// ============================================================================
// Constants
// ============================================================================

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Milliseconds in one hour */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Milliseconds in one day */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// ============================================================================
// Date Calculations
// ============================================================================

/**
 * Get the timestamp for the start of a given day (midnight local time).
 * 
 * @param ts - Unix timestamp in milliseconds
 * @returns Timestamp of midnight (00:00:00.000) on that day
 * 
 * @example
 * // For a timestamp on Jan 12, 2026 at 3:45 PM
 * startOfDay(1736693100000) // Returns timestamp for Jan 12, 2026 00:00:00
 */
export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/**
 * Convert a timestamp to a date key string for indexing.
 * 
 * @param ts - Unix timestamp in milliseconds
 * @returns Date string in "YYYY-MM-DD" format
 * 
 * @example
 * dayKey(1736693100000) // "2026-01-12"
 */
export function dayKey(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * Generate an array of date keys for the last N days.
 * 
 * @param n - Number of days to include
 * @param now - Reference timestamp (defaults to current time)
 * @returns Array of "YYYY-MM-DD" strings, ordered oldest to newest
 * 
 * @example
 * // If today is Jan 12, 2026
 * lastNDaysKeys(3) // ["2026-01-10", "2026-01-11", "2026-01-12"]
 */
export function lastNDaysKeys(n: number, now = Date.now()): string[] {
    const today0 = startOfDay(now);
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        keys.push(dayKey(today0 - i * MS_PER_DAY));
    }
    return keys;
}

/**
 * Build an array of daily start timestamps for the last N days.
 * 
 * @param days - Number of days to include
 * @param nowMs - Reference timestamp (defaults to current time)
 * @returns Array of midnight timestamps, ordered oldest to newest
 * 
 * @example
 * // Returns array of 7 timestamps starting 6 days ago
 * buildDailyStarts(7)
 */
export function buildDailyStarts(days: number, nowMs = Date.now()): number[] {
    const today0 = startOfDay(nowMs);
    const out: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
        out.push(today0 - i * MS_PER_DAY);
    }
    return out;
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format a duration in milliseconds to a human-readable string with seconds.
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2h 30m 15s" or "45m 30s" or "30s"
 * 
 * @example
 * formatDuration(9000000)   // "2h 30m"
 * formatDuration(9015000)   // "2h 30m 15s"
 * formatDuration(2700000)   // "45m"
 * formatDuration(2730000)   // "45m 30s"
 * formatDuration(30000)     // "30s"
 * formatDuration(0)          // "0s"
 */
export function formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / MS_PER_SECOND);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    
    return parts.join(' ');
}

/**
 * Format a duration in milliseconds to a detailed string with seconds.
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2h 30m 15s" or "45m 30s"
 * 
 * @example
 * formatDurationDetailed(9015000) // "2h 30m 15s"
 */
export function formatDurationDetailed(ms: number): string {
    const totalSec = Math.floor(ms / MS_PER_SECOND);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
