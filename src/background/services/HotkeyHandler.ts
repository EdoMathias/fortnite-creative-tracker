import { OWHotkeys } from '@overwolf/overwolf-api-ts';
import { kHotkeys } from '../../consts';
import { createLogger } from '../../services/Logger';

const logger = createLogger('HotkeyHandler');

export class HotkeyHandler {
  private _onToggle?: () => void;
  private _onShowHideTrackerVisibility?: () => void;
  private _onToggleDesktopWindow?: () => void;

  constructor() {
    this.initialize();
  }

  /**
   * Initializes hotkey listeners
   */
  private initialize(): void {
    OWHotkeys.onHotkeyDown(kHotkeys.showHideTracker, this.handleShowHideTrackerHotkey.bind(this));
    OWHotkeys.onHotkeyDown(kHotkeys.toggleDesktopWindow, this.handleToggleDesktopWindowHotkey.bind(this));
  }

  setOnToggle(callback: () => void): void {
    this._onToggle = callback;
  }

  setOnShowHideTrackerVisibility(callback: () => void): void {
    this._onShowHideTrackerVisibility = callback;
  }

  /**
   * Sets the callback for the toggle desktop window hotkey.
   * @param callback - The callback function to execute when the hotkey is pressed
   */
  setOnToggleDesktopWindow(callback: () => void): void {
    this._onToggleDesktopWindow = callback;
  }

  private async handleShowHideTrackerHotkey(e: overwolf.settings.hotkeys.OnPressedEvent): Promise<void> {
    logger.log('onHotkeyPressed (showHideTracker):', e);

    if (e.name === kHotkeys.showHideTracker && this._onShowHideTrackerVisibility) {
      await this._onShowHideTrackerVisibility();
    }
  }

  /**
   * Handles the toggle desktop window hotkey press.
   * @param e - The hotkey press event
   */
  private async handleToggleDesktopWindowHotkey(e: overwolf.settings.hotkeys.OnPressedEvent): Promise<void> {
    logger.log('onHotkeyPressed (toggleDesktopWindow):', e);

    if (e.name === kHotkeys.toggleDesktopWindow && this._onToggleDesktopWindow) {
      await this._onToggleDesktopWindow();
    }
  }
}

