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
  trackerDesktop: 'terminal_desktop',
  trackerIngame: 'terminal_ingame'
};

export const kHotkeys = {
  showHideTracker: 'Toggle In-Game Terminal',
  toggleDesktopWindow: 'Toggle Desktop Terminal'
};

export type HotkeyData = {
  name: string;
  title: string;
  binding: string;
  modifiers: overwolf.settings.hotkeys.HotkeyModifiers;
  virtualKeycode: number;
}

