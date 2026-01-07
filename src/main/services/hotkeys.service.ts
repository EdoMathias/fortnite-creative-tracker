import { OWHotkeys } from '@overwolf/overwolf-api-ts';
import { HotkeyData, kHotkeys } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('HotkeyService');

type HotkeyCallback = () => void | Promise<void>;

export class HotkeysService {
  private _callbacks: Map<string, HotkeyCallback> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    Object.values(kHotkeys).forEach((hotkeyName) => {
      OWHotkeys.onHotkeyDown(hotkeyName, (e) => this.handleHotkey(e));
    });
  }

  public on(hotkeyName: string, callback: HotkeyCallback): void {
    this._callbacks.set(hotkeyName, callback);
  }

  public off(hotkeyName: string): void {
    this._callbacks.delete(hotkeyName);
  }

  private async handleHotkey(e: overwolf.settings.hotkeys.OnPressedEvent): Promise<void> {
    const callback = this._callbacks.get(e.name);
    if (callback) {
      try {
        await callback();
      } catch (error) {
        console.error(`Hotkey callback error for ${e.name}:`, error);
      }
    }
  }
}