import { TrendDirection } from '../../../../../shared/consts';

/**
 * Calculate the percentage change from the first to last value in a trend array.
 * @param days - Array of daily values (e.g., playtime in ms)
 * @returns Percentage change, or null if cannot be calculated
 */
export function calculateTrendPercentage(days: number[]): number | null {
    const first = days[0];
    const last = days[days.length - 1];
    if (first <= 0 && last <= 0) return null;
    if (first <= 0) return null; // treat as NEW in UI
    return ((last - first) / first) * 100;
}

/**
 * Determine the trend direction based on percentage change.
 * @param pct - The percentage change (or null)
 * @param days - The trend data array
 * @returns 'up', 'down', or 'flat'
 */
export function getTrendDirection(pct: number | null, days: number[]): TrendDirection {
    // If NEW spike (started at 0, now has value)
    if (pct === null) {
        if (days[0] === 0 && days[days.length - 1] > 0) return 'up';
        return 'flat';
    }
    // Deadzone avoids flicker for small changes
    if (pct > 2) return 'up';
    if (pct < -2) return 'down';
    return 'flat';
}

/**
 * Generate a display label for the trend percentage.
 * @param days - Array of daily values
 * @returns Formatted string like "+25%", "-10%", "NEW", or "—"
 */
export function formatTrendLabel(days: number[]): string {
    const pct = calculateTrendPercentage(days);
    if (pct === null) {
        const isNew = days[0] === 0 && days[days.length - 1] > 0;
        return isNew ? 'NEW' : '—';
    }
    const rounded = Math.round(pct);
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
}
