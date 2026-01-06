import { OWWindow, OWGames } from '@overwolf/overwolf-api-ts';
import { kWindowNames } from '../../consts';
import { MessageChannel, MessageType } from './MessageChannel';
import { createLogger } from '../../services/Logger';
import { MonitorInfo } from './windows-odk/monitors.service';
import { WindowsManagerService } from './windows-odk/windows-manager.service';

const logger = createLogger('WindowManager');

export class WindowManager {
  private _windows: Record<string, OWWindow> = {};
  private _currentTrackerWindow: string = kWindowNames.trackerDesktop;
  private _hasSecondMonitor: boolean = false;
  private _secondMonitor: overwolf.utils.Display | undefined;
  private _messageChannel: MessageChannel;
  private _monitorsMap: Map<string, MonitorInfo> = new Map();

  // temp odk windows manager service
  private _windowsManagerService: WindowsManagerService;

  constructor(messageChannel: MessageChannel) {
    this._messageChannel = messageChannel;
    this._windows[kWindowNames.trackerDesktop] = new OWWindow(kWindowNames.trackerDesktop);
    this._windows[kWindowNames.trackerIngame] = new OWWindow(kWindowNames.trackerIngame);

    this.mapMonitors();

    // temp odk windows manager service
    this._windowsManagerService = new WindowsManagerService();
  }



  /**
   * Shows/Hides the desktop window or switches between desktop and in-game windows.
   * If there are 2 or more monitors, this toggles the desktop window visibility.
   * Otherwise, switches between desktop and in-game windows.
   * @returns void
   * @throws Error if no second monitor is found (when less than 2 monitors)
   */
  public async toggleDesktopWindow(): Promise<void> {
    // If 2 or more monitors, toggle desktop window visibility instead
    if (this._hasSecondMonitor && this._secondMonitor) {
      const window = this._windows[kWindowNames.trackerDesktop];
      if (!window) {
        logger.error('Desktop tracker window not found');
        return;
      }

      const windowState = await window.getWindowState();
      const isVisible = windowState.window_state === overwolf.windows.WindowStateEx.NORMAL ||
        windowState.window_state === overwolf.windows.WindowStateEx.MAXIMIZED;

      if (isVisible) {
        await this.minimizeWindow(kWindowNames.trackerDesktop);
      } else {
        await this.restoreWindow(kWindowNames.trackerDesktop);
      }
      return;
    }

    // Original behavior for single monitor case
    if (!this._hasSecondMonitor || !this._secondMonitor) {
      throw Error('No second monitor found');
    }

    const previousWindow = this._currentTrackerWindow;

    if (this._currentTrackerWindow === kWindowNames.trackerDesktop) {
      await this.close(kWindowNames.trackerDesktop);
      await this.showTrackerWindow(kWindowNames.trackerIngame);
    } else {
      await this.close(kWindowNames.trackerIngame);
      await this.showTrackerWindow(kWindowNames.trackerDesktop, true);
    }

    // Notify about window switch (only for single monitor case)
    this._messageChannel.broadcastMessage(
      [kWindowNames.background],
      MessageType.TRACKER_WINDOW_SWITCHED,
      {
        previousWindow,
        currentWindow: this._currentTrackerWindow
      }
    );
  }

  /**
   * Shows or hides the in-game tracker window.
   */
  public async toggleTrackerWindowVisibility(): Promise<void> {
    const window = this._windows[kWindowNames.trackerIngame];
    if (!window) {
      logger.error('In-game tracker window not found');
      return;
    }

    const windowState = await window.getWindowState();
    const isVisible = windowState.window_state === overwolf.windows.WindowStateEx.NORMAL ||
      windowState.window_state === overwolf.windows.WindowStateEx.MAXIMIZED;

    if (isVisible) {
      await this.minimizeWindow(kWindowNames.trackerIngame);
    } else {
      await this.restoreWindow(kWindowNames.trackerIngame);
    }
  }

  async close(windowName: string): Promise<void> {
    const window = this._windows[windowName];
    if (!window) {
      throw new Error(`Window ${windowName} not found`);
    }
    await window.close();
  }

  public async onGameLaunch(): Promise<void> {
    // if has second monitor, show the tracker window on the second monitor
    if (this._hasSecondMonitor && this._secondMonitor) {
      await this.showTrackerWindow(kWindowNames.trackerDesktop, true);
      // Switch to widgets view when game launches with second monitor
      await this._messageChannel.sendMessage(
        kWindowNames.trackerDesktop,
        MessageType.SWITCH_VIEW_MODE,
        { viewMode: 'widgets' }
      );
    }

    // Always obtain the in-game window so we can use the hotkey to show/hide it
    // If there's no second monitor, don't show it immediately - it will be shown via hotkey
    overwolf.windows.obtainDeclaredWindow(kWindowNames.trackerIngame, (result) => {
      if (result.success) {
        logger.log('In-game tracker window obtained:', result.window.name);
        // If there's no second monitor, don't show it immediately - it will be shown via hotkey
        if (!this._hasSecondMonitor || !this._secondMonitor) {
          // Window is obtained but not shown - will be shown via ctrl+g hotkey
        }
      }
    });
  }

  public async onGameExit(): Promise<void> {
    // Close the in-game tracker window
    overwolf.windows.close(kWindowNames.trackerIngame, (result) => {
      if (result.success) {
        logger.log('In-game tracker window closed:', result.window_id);
      }
    });

    // Move the desktop tracker window to the center of the main monitor
    // This retains the monitor moving logic for the desktop window
    overwolf.windows.obtainDeclaredWindow(kWindowNames.trackerDesktop, (result) => {
      if (result.success) {
        const window = result.window;
        const center = this.calculateMonitorCenter(window.width, window.height, true);
        overwolf.windows.changePosition(window.name, center.x, center.y);
        overwolf.windows.restore(window.name, () => {
          overwolf.windows.bringToFront(window.name, true, () => { });
        });
        this._currentTrackerWindow = kWindowNames.trackerDesktop;
      }
    });
  }

  /**
   * Shows the desktop tracker window.
   */
  public async showDesktopWindow(): Promise<void> {
    await this.close(kWindowNames.trackerIngame);
    overwolf.windows.obtainDeclaredWindow(kWindowNames.trackerDesktop, async (result) => {
      if (result.success) {
        const center = this.calculateMonitorCenter(result.window.width, result.window.height, true);
        overwolf.windows.changePosition(result.window.name, center.x, center.y);
        overwolf.windows.restore(result.window.name, () => { });
        overwolf.windows.bringToFront(kWindowNames.trackerDesktop, true, () => { });
        this._currentTrackerWindow = kWindowNames.trackerDesktop;
      }
    });
  }


  /**
   * Shows a tracker window.
   * @param trackerWindowName - The name of the tracker window to show.
   * @param moveToSecondMonitor - Whether to move the window to the second monitor.
   * @returns A promise that resolves when the window is shown.
   */
  private showTrackerWindow(trackerWindowName: string, moveToSecondMonitor: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      overwolf.windows.obtainDeclaredWindow(trackerWindowName, (result) => {
        if (result.success) {
          const window = result.window;
          if (moveToSecondMonitor && this._hasSecondMonitor && this._secondMonitor) {
            // change size to default to prevent the window overlapping with the Game's window
            // on smaller monitors
            overwolf.windows.changeSize(window.name, 1600, 800);
            const center = this.calculateMonitorCenter(window.width, window.height, false);
            overwolf.windows.changePosition(window.name, center.x, center.y, () => {
              logger.log('Tracker window changed position:', center);
            });
          }
          overwolf.windows.restore(window.name, () => {
            overwolf.windows.bringToFront(window.name, true, () => { });
            this._currentTrackerWindow = trackerWindowName;
            resolve();
          });
        } else {
          reject(new Error(`Failed to obtain window: ${result.error}`));
        }
      });
    });
  }

  /**
   * Restores a window.
   * @param windowName - The name of the window to restore.
   * @returns A promise that resolves when the window is restored.
   */
  private async restoreWindow(windowName: string): Promise<void> {
    const window = this._windows[windowName];
    if (!window) {
      throw new Error(`Window ${windowName} not found`);
    }
    return new Promise((resolve, reject) => {
      overwolf.windows.restore(windowName, (result) => {
        if (!result.success) {
          reject(new Error(`Failed to restore window: ${result.error}`));
        }
        overwolf.windows.bringToFront(windowName, true, () => { });
        resolve();
      });
    });
  }

  /**
 * Minimizes a window.
 * @param windowName - The name of the window to minimize.
 * @returns A promise that resolves when the window is minimized.
 */
  private async minimizeWindow(windowName: string): Promise<void> {
    const window = this._windows[windowName];
    if (!window) {
      throw new Error(`Window ${windowName} not found`);
    }
    return new Promise((resolve, reject) => {
      overwolf.windows.minimize(windowName, (result) => {
        if (!result.success) {
          reject(new Error(`Failed to minimize window: ${result.error}`));
        }
        resolve();
      });
    });
  }

  /**
   * Maps all user monitors and records whether each is primary or not.
   * Also updates the second monitor reference for backward compatibility.
   */
  private mapMonitors(): void {
    overwolf.utils.getMonitorsList((result) => {
      if (result.success) {
        // Clear existing map
        this._monitorsMap.clear();

        // Map all monitors with their primary status
        result.displays.forEach((display) => {
          this._monitorsMap.set(display.id, {
            display: display,
            isPrimary: display.is_primary === true
          });
        });

        // Update second monitor reference for backward compatibility
        this._hasSecondMonitor = result.displays.length > 1;
        if (this._hasSecondMonitor) {
          this._secondMonitor = result.displays.find(display => display.is_primary === false);
        } else {
          this._secondMonitor = undefined;
        }

        logger.log(`Mapped ${this._monitorsMap.size} monitor(s)`, {
          primary: Array.from(this._monitorsMap.values()).find(m => m.isPrimary)?.display.id,
          secondary: Array.from(this._monitorsMap.values()).find(m => !m.isPrimary)?.display.id
        });
      } else {
        logger.error('Failed to get monitors list:', result.error);
      }
    });
  }

  /**
   * Gets the primary monitor.
   * @returns The primary monitor info, or undefined if not found
   */
  public getPrimaryMonitor(): MonitorInfo | undefined {
    return Array.from(this._monitorsMap.values()).find(monitor => monitor.isPrimary);
  }

  /**
   * Gets the secondary monitor (non-primary).
   * @returns The secondary monitor info, or undefined if not found
   */
  public getSecondaryMonitor(): MonitorInfo | undefined {
    return Array.from(this._monitorsMap.values()).find(monitor => !monitor.isPrimary);
  }

  /**
   * Calculates the center position of a monitor based on whether it's primary or not.
   * @param windowWidth - The width of the window.
   * @param windowHeight - The height of the window.
   * @param isPrimary - Whether to use the primary monitor (true) or secondary monitor (false).
   * @returns The center coordinates {x, y} of the specified monitor.
   * @throws Error if the requested monitor is not found.
   */
  private calculateMonitorCenter(windowWidth: number, windowHeight: number, isPrimary: boolean): { x: number, y: number } {
    const monitorInfo = isPrimary ? this.getPrimaryMonitor() : this.getSecondaryMonitor();


    if (!monitorInfo) {
      const monitorType = isPrimary ? 'primary' : 'secondary';
      throw new Error(`No ${monitorType} monitor found`);
    }

    const display = monitorInfo.display;
    const workingArea = (display as any).workingArea as { left: number; top: number; width: number; height: number } | undefined;
    const workAreaLeft = workingArea?.left ?? display.x;
    const workAreaTop = workingArea?.top ?? display.y;
    const workAreaWidth = workingArea?.width ?? display.width;
    const workAreaHeight = workingArea?.height ?? display.height;

    logger.log('Calculating monitor center for window:', {
      windowWidth,
      windowHeight,
      isPrimary,
      display,
      workArea: { workAreaLeft, workAreaTop, workAreaWidth, workAreaHeight }
    });

    const desiredX = workAreaLeft + Math.floor((workAreaWidth - windowWidth) / 2);
    const desiredY = workAreaTop + Math.floor((workAreaHeight - windowHeight) / 2);

    const minX = workAreaLeft;
    const maxX = workAreaLeft + workAreaWidth - windowWidth;
    const minY = workAreaTop;
    const maxY = workAreaTop + workAreaHeight - windowHeight;

    const x = windowWidth >= workAreaWidth
      ? workAreaLeft
      : Math.max(minX, Math.min(desiredX, maxX));

    const y = windowHeight >= workAreaHeight
      ? workAreaTop
      : Math.max(minY, Math.min(desiredY, maxY));

    const center = { x: Math.floor(x), y: Math.floor(y) };
    logger.log('Calculated center:', center);
    return center;
  }

}

