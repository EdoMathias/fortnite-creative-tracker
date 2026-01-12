/**
 * @fileoverview Mock Data for Top Maps - Sample data for development and testing.
 * Generates realistic-looking map data with trends for each time range.
 * 
 * @remarks
 * This file should only be used during development. In production,
 * data comes from the top-maps.facade via MessageChannel.
 */

import { MapData, TimeRange, TrendDirection } from '../../../../../shared/consts';

// ============================================================================
// Types
// ============================================================================

/** Base map information without time-dependent data */
interface BaseMapInfo {
    map_id: string;
    title: string;
    trendDirection: TrendDirection;
}

// ============================================================================
// Mock Data Generation
// ============================================================================

/**
 * Generate mock trend data with a specified direction and variability.
 * 
 * @param points - Number of data points to generate
 * @param direction - Overall trend direction ('up', 'down', 'flat')
 * @param baseValue - Base value for calculations (affects scale)
 * @returns Array of trend values
 * 
 * @example
 * generateTrend(7, 'up', 30)   // [12, 18, 22, 28, 32, 38, 42]
 * generateTrend(7, 'down', 30) // [42, 38, 35, 30, 26, 22, 18]
 */
function generateTrend(
    points: number,
    direction: TrendDirection,
    baseValue: number = 30
): number[] {
    const trend: number[] = [];
    
    // Set initial value based on direction
    let value = direction === 'up'
        ? baseValue * 0.3
        : direction === 'down'
            ? baseValue * 1.5
            : baseValue;

    for (let i = 0; i < points; i++) {
        // Add controlled randomness for realism
        const noise = (Math.random() - 0.5) * baseValue * 0.2;

        if (direction === 'up') {
            value += (baseValue / points) * 1.2 + noise;
        } else if (direction === 'down') {
            value -= (baseValue / points) * 0.8 + noise;
        } else {
            value += noise;
        }

        trend.push(Math.max(0, Math.round(value)));
    }

    return trend;
}

/**
 * Add rank property to map data based on array position.
 * 
 * @param items - Array of map data without ranks
 * @returns Array with ranks assigned (1-indexed)
 */
function withRanks(items: Omit<MapData, 'rank'>[]): MapData[] {
    return items.map((m, i) => ({
        ...m,
        rank: i + 1,
    }));
}

// ============================================================================
// Base Data
// ============================================================================

/** Sample map information for mock data generation */
const BASE_MAP_INFO: BaseMapInfo[] = [
    {
        map_id: '0497-4522-9912',
        title: 'GARDEN VS BRAINROTS',
        trendDirection: 'up',
    },
    {
        map_id: '1234-5678-9012',
        title: 'BOX FIGHT PRACTICE',
        trendDirection: 'down',
    },
    {
        map_id: '9876-5432-1098',
        title: 'ZONE WARS ELITE',
        trendDirection: 'up',
    },
    {
        map_id: '5555-6666-7777',
        title: 'AIM TRAINER PRO',
        trendDirection: 'down',
    },
    {
        map_id: '1111-2222-3333',
        title: 'CREATIVE BUILDING',
        trendDirection: 'up',
    },
];

// ============================================================================
// Constants
// ============================================================================

/**
 * Number of data points per time range:
 * - today: 24 points (hourly)
 * - 7d: 7 points (daily)
 * - 30d: 30 points (daily)
 * - all: 12 points (monthly)
 */
const TREND_POINTS: Record<TimeRange, number> = {
    today: 24,
    '7d': 7,
    '30d': 30,
    all: 12,
};

// ============================================================================
// Mock Data Export
// ============================================================================

/**
 * Mock map data organized by time range.
 * Use this for development/testing when the backend isn't available.
 * 
 * @example
 * ```tsx
 * const maps = mockTopMapsByRange['7d'];
 * // Returns 5 mock maps with 7-day trend data
 * ```
 */
export const mockTopMapsByRange: Record<TimeRange, MapData[]> = {
    today: withRanks([
        {
            ...BASE_MAP_INFO[2],
            trend: generateTrend(TREND_POINTS.today, 'up', 5),
            timePlayed: '1h 10m',
            playCount: 2,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[0],
            trend: generateTrend(TREND_POINTS.today, 'up', 4),
            timePlayed: '55m',
            playCount: 1,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[4],
            trend: generateTrend(TREND_POINTS.today, 'flat', 2),
            timePlayed: '30m',
            playCount: 1,
            lastPlayed: '2026-01-12',
        },
    ]),

    '7d': withRanks([
        {
            ...BASE_MAP_INFO[0],
            trend: generateTrend(TREND_POINTS['7d'], 'up', 120),
            timePlayed: '14h 20m',
            playCount: 18,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[1],
            trend: generateTrend(TREND_POINTS['7d'], 'down', 110),
            timePlayed: '12h 45m',
            playCount: 22,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[2],
            trend: generateTrend(TREND_POINTS['7d'], 'up', 80),
            timePlayed: '9h 15m',
            playCount: 11,
            lastPlayed: '2026-01-11',
        },
        {
            ...BASE_MAP_INFO[3],
            trend: generateTrend(TREND_POINTS['7d'], 'down', 65),
            timePlayed: '7h 30m',
            playCount: 9,
            lastPlayed: '2026-01-10',
        },
        {
            ...BASE_MAP_INFO[4],
            trend: generateTrend(TREND_POINTS['7d'], 'up', 50),
            timePlayed: '5h 50m',
            playCount: 6,
            lastPlayed: '2026-01-10',
        },
    ]),

    '30d': withRanks([
        {
            ...BASE_MAP_INFO[1],
            trend: generateTrend(TREND_POINTS['30d'], 'down', 90),
            timePlayed: '41h 05m',
            playCount: 60,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[0],
            trend: generateTrend(TREND_POINTS['30d'], 'up', 75),
            timePlayed: '36h 40m',
            playCount: 44,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[2],
            trend: generateTrend(TREND_POINTS['30d'], 'up', 45),
            timePlayed: '22h 10m',
            playCount: 28,
            lastPlayed: '2026-01-11',
        },
        {
            ...BASE_MAP_INFO[4],
            trend: generateTrend(TREND_POINTS['30d'], 'flat', 25),
            timePlayed: '12h 35m',
            playCount: 14,
            lastPlayed: '2026-01-10',
        },
        {
            ...BASE_MAP_INFO[3],
            trend: generateTrend(TREND_POINTS['30d'], 'down', 20),
            timePlayed: '9h 05m',
            playCount: 12,
            lastPlayed: '2026-01-09',
        },
    ]),

    all: withRanks([
        {
            ...BASE_MAP_INFO[0],
            trend: generateTrend(TREND_POINTS.all, 'up', 600),
            timePlayed: '128h 12m',
            playCount: 210,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[1],
            trend: generateTrend(TREND_POINTS.all, 'down', 550),
            timePlayed: '97h 50m',
            playCount: 175,
            lastPlayed: '2026-01-12',
        },
        {
            ...BASE_MAP_INFO[2],
            trend: generateTrend(TREND_POINTS.all, 'up', 350),
            timePlayed: '63h 18m',
            playCount: 102,
            lastPlayed: '2026-01-11',
        },
        {
            ...BASE_MAP_INFO[3],
            trend: generateTrend(TREND_POINTS.all, 'flat', 250),
            timePlayed: '44h 10m',
            playCount: 80,
            lastPlayed: '2026-01-09',
        },
        {
            ...BASE_MAP_INFO[4],
            trend: generateTrend(TREND_POINTS.all, 'up', 120),
            timePlayed: '21h 55m',
            playCount: 36,
            lastPlayed: '2026-01-10',
        },
    ]),
};
