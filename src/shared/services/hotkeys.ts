import { FORTNITE_GAME_ID, HotkeyData } from '../consts';

export const HotkeysAPI = {
  /**
   * Fetch all hotkeys for the game
   */
  fetchAll(): Promise<Map<string, overwolf.settings.hotkeys.IHotkey>> {
    return new Promise((resolve, reject) => {
      overwolf.settings.hotkeys.get((result) => {
        if (!result.success) {
          reject(result.error);
          return;
        }
        const gameHotkeys = result.games?.[FORTNITE_GAME_ID] ?? [];
        const map = new Map<string, overwolf.settings.hotkeys.IHotkey>();
        gameHotkeys.forEach(h => map.set(h.name, h));
        resolve(map);
      });
    });
  },

  /**
   * Update a hotkey binding
   */
  update(hotkeyData: HotkeyData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Unassign first (ignore errors - hotkey might not exist)
      overwolf.settings.hotkeys.unassign({ name: hotkeyData.name }, () => {
        // Then assign the new binding
        overwolf.settings.hotkeys.assign(
          {
            name: hotkeyData.name,
            modifiers: hotkeyData.modifiers,
            virtualKey: hotkeyData.virtualKeycode,
            gameId: FORTNITE_GAME_ID,
          },
          (result) => {
            if (result.success) {
              resolve();
            } else {
              reject(result.error);
            }
          }
        );
      });
    });
  },
};