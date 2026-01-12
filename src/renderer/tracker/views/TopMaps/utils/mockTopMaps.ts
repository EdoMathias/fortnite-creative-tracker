import { MapData, TimeRange } from '../../../../../shared/consts';

// Generate mock trend data with specified number of points
function generateTrend(
  points: number,
  direction: 'up' | 'down' | 'flat',
  baseValue: number = 30
): number[] {
  const trend: number[] = [];
  let value =
    direction === 'up'
      ? baseValue * 0.3
      : direction === 'down'
      ? baseValue * 1.5
      : baseValue;

  for (let i = 0; i < points; i++) {
    // Add some randomness
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

// Base map info (without trend data - that's generated per time range)
const baseMapInfo = [
  {
    map_id: '0497-4522-9912',
    title: 'GARDEN VS BRAINROTS',
    trendDirection: 'up' as const,
  },
  {
    map_id: '1234-5678-9012',
    title: 'BOX FIGHT PRACTICE',
    trendDirection: 'down' as const,
  },
  {
    map_id: '9876-5432-1098',
    title: 'ZONE WARS ELITE',
    trendDirection: 'up' as const,
  },
  {
    map_id: '5555-6666-7777',
    title: 'AIM TRAINER PRO',
    trendDirection: 'down' as const,
  },
  {
    map_id: '1111-2222-3333',
    title: 'CREATIVE BUILDING',
    trendDirection: 'up' as const,
  },
];

function withRanks(items: Omit<MapData, 'rank'>[]): MapData[] {
  return items.map((m, i) => ({
    ...m,
    rank: i + 1,
  }));
}

// Point counts per time range:
// - today: 24 points (hourly)
// - 7d: 7 points (daily)
// - 30d: 30 points (daily)
// - all: 12 points (monthly)

export const mockTopMapsByRange: Record<TimeRange, MapData[]> = {
  today: withRanks([
    {
      ...baseMapInfo[2],
      trend: generateTrend(24, 'up', 5),
      timePlayed: '1h 10m',
      playCount: 2,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[0],
      trend: generateTrend(24, 'up', 4),
      timePlayed: '55m',
      playCount: 1,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[4],
      trend: generateTrend(24, 'flat', 2),
      timePlayed: '30m',
      playCount: 1,
      lastPlayed: '2026-01-12',
    },
  ]),

  '7d': withRanks([
    {
      ...baseMapInfo[0],
      trend: generateTrend(7, 'up', 120),
      timePlayed: '14h 20m',
      playCount: 18,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[1],
      trend: generateTrend(7, 'down', 110),
      timePlayed: '12h 45m',
      playCount: 22,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[2],
      trend: generateTrend(7, 'up', 80),
      timePlayed: '9h 15m',
      playCount: 11,
      lastPlayed: '2026-01-11',
    },
    {
      ...baseMapInfo[3],
      trend: generateTrend(7, 'down', 65),
      timePlayed: '7h 30m',
      playCount: 9,
      lastPlayed: '2026-01-10',
    },
    {
      ...baseMapInfo[4],
      trend: generateTrend(7, 'up', 50),
      timePlayed: '5h 50m',
      playCount: 6,
      lastPlayed: '2026-01-10',
    },
  ]),

  '30d': withRanks([
    {
      ...baseMapInfo[1],
      trend: generateTrend(30, 'down', 90),
      timePlayed: '41h 05m',
      playCount: 60,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[0],
      trend: generateTrend(30, 'up', 75),
      timePlayed: '36h 40m',
      playCount: 44,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[2],
      trend: generateTrend(30, 'up', 45),
      timePlayed: '22h 10m',
      playCount: 28,
      lastPlayed: '2026-01-11',
    },
    {
      ...baseMapInfo[4],
      trend: generateTrend(30, 'flat', 25),
      timePlayed: '12h 35m',
      playCount: 14,
      lastPlayed: '2026-01-10',
    },
    {
      ...baseMapInfo[3],
      trend: generateTrend(30, 'down', 20),
      timePlayed: '9h 05m',
      playCount: 12,
      lastPlayed: '2026-01-09',
    },
  ]),

  all: withRanks([
    {
      ...baseMapInfo[0],
      trend: generateTrend(12, 'up', 600),
      timePlayed: '128h 12m',
      playCount: 210,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[1],
      trend: generateTrend(12, 'down', 550),
      timePlayed: '97h 50m',
      playCount: 175,
      lastPlayed: '2026-01-12',
    },
    {
      ...baseMapInfo[2],
      trend: generateTrend(12, 'up', 350),
      timePlayed: '63h 18m',
      playCount: 102,
      lastPlayed: '2026-01-11',
    },
    {
      ...baseMapInfo[3],
      trend: generateTrend(12, 'flat', 250),
      timePlayed: '44h 10m',
      playCount: 80,
      lastPlayed: '2026-01-09',
    },
    {
      ...baseMapInfo[4],
      trend: generateTrend(12, 'up', 120),
      timePlayed: '21h 55m',
      playCount: 36,
      lastPlayed: '2026-01-10',
    },
  ]),
};
