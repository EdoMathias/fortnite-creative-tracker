export const kGamesFeatures = new Map<number, string[]>([
  // Arc Raiders
  [
    27168,
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

export const kGameClassIds = [27168, 1136];

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

