import { OWHotkeys } from '@overwolf/overwolf-api-ts';
import { kHotkeys } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('HotkeyService');

type HotkeyCallback = () => void | Promise<void>;

export class HotkeysService {
  private _callbacks: Map<string, HotkeyCallback> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Register all hotkeys from kHotkeys
    Object.values(kHotkeys).forEach((hotkeyName) => {
      OWHotkeys.onHotkeyDown(hotkeyName, (e) => this.handleHotkey(e));
    });
  }

  /**
   * Register a callback for a specific hotkey
   */
  public on(hotkeyName: string, callback: HotkeyCallback): void {
    this._callbacks.set(hotkeyName, callback);
  }

  /**
   * Unregister a callback for a specific hotkey
   */
  public off(hotkeyName: string): void {
    this._callbacks.delete(hotkeyName);
  }

  /**
   * Unified hotkey handler - dispatches to registered callbacks
   */
  private async handleHotkey(e: overwolf.settings.hotkeys.OnPressedEvent): Promise<void> {
    logger.log('onHotkeyPressed:', e.name);

    const callback = this._callbacks.get(e.name);
    if (callback) {
      await callback();
    }
  }
}