export const FORTNITE_GAME_ID = 21216;

export const kGamesFeatures = new Map<number, string[]>([
  // Fortnite
  [
    FORTNITE_GAME_ID,
    [
      'map', 'phase'
    ]
  ],
  // Guild Wars (for debugging faster)
  [
    1136,
    [
    ]
  ]
]);

export const kGameClassIds = [FORTNITE_GAME_ID, 1136];

export const kWindowNames = {
  background: 'background',
  trackerDesktop: 'tracker_desktop',
  trackerIngame: 'tracker_ingame'
};

export const kHotkeys = {
  toggleTrackerIngameWindow: 'Toggle In-Game Tracker',
  toggleTrackerDesktopWindow: 'Toggle Desktop Tracker'
};

export type HotkeyData = {
  name: string;
  title: string;
  binding: string;
  modifiers: overwolf.settings.hotkeys.HotkeyModifiers;
  virtualKeycode: number;
}

export const kBaseCreativeMapsUrl = 'https://play.fn.gg/island';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface MapData {
  map_id: string;
  title?: string;
  thumbnail?: string;
  playCount?: number;
  lastPlayed?: string;
  rank: number;
  timePlayed: string;
  trend: number[];
  trendDirection: TrendDirection;
}

export type MapSession = {
  map_id: string;
  startedAt: number;
  endedAt: number;
}

export type TimeRange = "today" | "7d" | "30d" | "all";

export const mockTopMaps = [
  {
    map_id: "0497-4522-9912",
    title: "GARDEN VS BRAINROTS",
    rank: 1,
    timePlayed: "14h 20m",
    playCount: 18,
    lastPlayed: "2026-01-11",
    trend: [10, 18, 25, 32, 41, 55, 70], // last 7 days (relative values)
    trendDirection: "up",
  },
  {
    map_id: "1234-5678-9012",
    title: "BOX FIGHT PRACTICE",
    rank: 2,
    timePlayed: "12h 45m",
    playCount: 22,
    lastPlayed: "2026-01-11",
    trend: [60, 58, 55, 50, 48, 44, 40],
    trendDirection: "down",
  },
  {
    map_id: "9876-5432-1098",
    title: "ZONE WARS ELITE",
    rank: 3,
    timePlayed: "9h 15m",
    playCount: 11,
    lastPlayed: "2026-01-10",
    trend: [12, 15, 20, 22, 30, 38, 45],
    trendDirection: "up",
  },
  {
    map_id: "5555-6666-7777",
    title: "AIM TRAINER PRO",
    rank: 4,
    timePlayed: "7h 30m",
    playCount: 9,
    lastPlayed: "2026-01-09",
    trend: [35, 34, 33, 32, 30, 29, 28],
    trendDirection: "down",
  },
  {
    map_id: "1111-2222-3333",
    title: "CREATIVE BUILDING",
    rank: 5,
    timePlayed: "5h 50m",
    playCount: 6,
    lastPlayed: "2026-01-08",
    trend: [0, 0, 5, 12, 18, 24, 30], // NEW-ish map
    trendDirection: "up",
  },
];