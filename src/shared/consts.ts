export const FORTNITE_GAME_ID = 21216;

export const kGamesFeatures = new Map<number, string[]>([
  // Fortnite
  [FORTNITE_GAME_ID, ['map', 'phase']],
  // Guild Wars (for debugging faster)
  [1136, []],
]);

export const kGameClassIds = [FORTNITE_GAME_ID, 1136];

export const kWindowNames = {
  background: 'background',
  trackerDesktop: 'tracker_desktop',
  trackerIngame: 'tracker_ingame',
};

export const kHotkeys = {
  toggleTrackerIngameWindow: 'Toggle In-Game Tracker',
  toggleTrackerDesktopWindow: 'Toggle Desktop Tracker',
};

export type HotkeyData = {
  name: string;
  title: string;
  binding: string;
  modifiers: overwolf.settings.hotkeys.HotkeyModifiers;
  virtualKeycode: number;
};

export const kBaseCreativeMapsUrl = 'https://play.fn.gg/island';
export const kFortniteDeepLink =
  'com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true&arg=-IslandOverride=';

export const kFortniteBRdeeplink = 'com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true&arg=-IslandOverride%3Dset_br_playlists';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface MapData {
  map_id: string;
  title?: string;
  thumbnail?: string;
  description?: string;
  plays?: number;
  /** Unified time in milliseconds */
  timePlayedMs: number;
  playCount?: number;
  lastPlayed?: string;
  rank?: number;
  trend?: number[];
  trendDirection?: TrendDirection;
  isFallback?: boolean;
}

export type MapSession = {
  map_id: string;
  startedAt: number;
  endedAt: number;
};

export interface MapUpdatePayload {
  map_id: string;
  title?: string;
  account_id?: string;
  creative_mode_version?: string;
  version?: string;
};

export interface ActiveSession {
  map_id: string;
  startedAt: number;
}

export interface SessionEndedInfo {
  map_id: string;
  totalTimeMs: number;
}

export interface MapUpdateMessage {
  map: MapUpdatePayload | null;
  activeSession: ActiveSession | null;
  /** Info about the session that just ended (when leaving a map) */
  sessionEnded?: SessionEndedInfo;
}

export type TimeRange = 'today' | '7d' | '30d' | 'all';

// Note: Mock data has been removed - all views now use real data from the top-maps store
