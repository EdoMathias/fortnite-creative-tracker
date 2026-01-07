export const FORTNITE_GAME_ID = 21216;

export const kGamesFeatures = new Map<number, string[]>([
  // Fortnite
  [
    FORTNITE_GAME_ID,
    [
      'match_info','game_info'
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

