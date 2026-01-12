/**
 * @fileoverview Trend Utilities - Functions for calculating and formatting trend data.
 * Used for displaying play time momentum in the Top Maps view.
 */

import { TrendDirection } from '../../../../../shared/consts';

// ============================================================================
// Constants
// ============================================================================

/** Percentage threshold for trend direction (avoids flicker on small changes) */
const TREND_DEADZONE_PCT = 2;

// ============================================================================
// Trend Calculations
// ============================================================================

/**
 * Calculate the percentage change from the first to last value in a trend array.
 * Used to determine if playtime is trending up or down.
 * 
 * @param days - Array of daily values (e.g., playtime in ms)
 * @returns Percentage change, or null if cannot be calculated (e.g., division by zero)
 * 
 * @example
 * calculateTrendPercentage([10, 15, 20]) // 100 (doubled)
 * calculateTrendPercentage([20, 15, 10]) // -50 (halved)
 * calculateTrendPercentage([0, 0, 10])   // null (can't calculate from 0)
 */
export function calculateTrendPercentage(days: number[]): number | null {
    const first = days[0];
    const last = days[days.length - 1];
    
    // Can't calculate percentage if both are zero or first is zero
    if (first <= 0 && last <= 0) return null;
    if (first <= 0) return null; // Treat as NEW in UI
    
    return ((last - first) / first) * 100;
}

/**
 * Determine the trend direction based on percentage change.
 * Uses a deadzone to prevent flickering on small day-to-day variations.
 * 
 * @param pct - The percentage change (or null for new maps)
 * @param days - The trend data array (used to detect new maps)
 * @returns Trend direction: 'up', 'down', or 'flat'
 * 
 * @example
 * getTrendDirection(50, [10, 15])  // 'up'
 * getTrendDirection(-30, [20, 14]) // 'down'
 * getTrendDirection(1, [10, 10.1]) // 'flat' (within deadzone)
 * getTrendDirection(null, [0, 10]) // 'up' (new map with activity)
 */
export function getTrendDirection(pct: number | null, days: number[]): TrendDirection {
    // Handle NEW maps (started at 0, now has value)
    if (pct === null) {
        if (days[0] === 0 && days[days.length - 1] > 0) return 'up';
        return 'flat';
    }
    
    // Apply deadzone to avoid flicker
    if (pct > TREND_DEADZONE_PCT) return 'up';
    if (pct < -TREND_DEADZONE_PCT) return 'down';
    return 'flat';
}

/**
 * Generate a human-readable label for the trend percentage.
 * Shows percentage with sign, or special labels for edge cases.
 * 
 * @param days - Array of daily values
 * @returns Formatted string: "+25%", "-10%", "NEW", or "—"
 * 
 * @example
 * formatTrendLabel([10, 15, 20]) // "+100%"
 * formatTrendLabel([20, 15, 10]) // "-50%"
 * formatTrendLabel([0, 0, 10])   // "NEW"
 * formatTrendLabel([0, 0, 0])    // "—"
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
