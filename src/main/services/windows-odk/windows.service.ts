import { DesktopWindow, OSRWindow, WindowBase, Windows } from "@overwolf/odk-ts";
import { createLogger } from "../../../shared/services/Logger";
import { Edge } from "@overwolf/odk-ts/window/enums/edge";
import { MonitorsService } from "./monitors.service";
import { OSRType } from "@overwolf/odk-ts/window/enums/osr_window_type";
import { OSRWindowOptions } from "@overwolf/odk-ts/window/options/osr_window_options";
import { DesktopWindowOptions } from "@overwolf/odk-ts/window/options/desktop_window_options";

const logger = createLogger('WindowsManagerService');

type WindowTypes = DesktopWindow | OSRWindow;

const windowsConfigs: Record<string, OSRWindowOptions | DesktopWindowOptions> = {
    'tracker_desktop': {
        id: 'tracker_desktop',
        url: 'tracker_desktop.html',
        width: 1600,
        minWidth: 1600,
        height: 800,
        minHeight: 800,
        resizable: true,
    },
    'tracker_ingame': {
        id: 'tracker_ingame',
        url: 'tracker_ingame.html',
        width: 1600,
        height: 800,
        minWidth: 1600,
        minHeight: 800,
        type: OSRType.InGameOnly,
        topMost: true
    }
}

export class WindowsService {
    private _trackerDesktopWindow: DesktopWindow | undefined;
    private _trackerIngameWindow: OSRWindow | undefined;

    private _monitorsService: MonitorsService;

    constructor() {
        this._monitorsService = new MonitorsService();
    }

    //--------------------------------------------------------------------------
    // Windows getter
    public async getWindowById(windowId: string): Promise<WindowBase | undefined> {
        try {
            const window = await Windows.FromId(windowId);
            if (window) {
                return window;
            } else {
                return undefined;
            }
        } catch (error) {
            logger.error('Error getting window by id:', error);
            return undefined;
        }
    }

    //--------------------------------------------------------------------------
    // Tracker Desktop Window
    public async createTrackerDesktopWindow(): Promise<void> {
        if (this._trackerDesktopWindow && await this._trackerDesktopWindow.isOpen()) {
            return;
        } else {
            this._trackerDesktopWindow = new DesktopWindow(windowsConfigs['tracker_desktop']);
            logger.log('Tracker desktop window created');
        }
    }

    public async showTrackerDesktopWindow(centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        if (!this._trackerDesktopWindow) {
            await this.createTrackerDesktopWindow();
        }

        await this.showWindow(this._trackerDesktopWindow, centerOnMonitor, dockTo);
    }

    public async closeTrackerDesktopWindow(): Promise<void> {
        await this.closeWindow(this._trackerDesktopWindow);
    }

    public async toggleTrackerDesktopWindow(): Promise<void> {
        await this.toggleWindow(this._trackerDesktopWindow);
    }

    //--------------------------------------------------------------------------
    // Tracker Ingame Window
    public async createTrackerIngameWindow(): Promise<void> {
        if (this._trackerIngameWindow && await this._trackerIngameWindow.isOpen()) {
            return;
        } else {
            this._trackerIngameWindow = new OSRWindow(windowsConfigs['tracker_ingame']);
            logger.log('Tracker in-game window created');
        }
    }

    public async showTrackerIngameWindow(centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        await this.showWindow(this._trackerIngameWindow, centerOnMonitor, dockTo);
    }

    public async closeTrackerIngameWindow(): Promise<void> {
        await this.closeWindow(this._trackerIngameWindow);
    }

    public async toggleTrackerIngameWindow(): Promise<void> {
        await this.toggleWindow(this._trackerIngameWindow);
    }

    //--------------------------------------------------------------------------
    /**
     * Shows a window
     * @param window - The window to show
     * @param centerOnMonitor - The monitor to center the window on
     * @param dockTo - The edge to dock the window to
     */
    private async showWindow(window: WindowTypes, centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        try {
            // Show needs to be called before centerOnMonitor and dockTo to work
            const result = await window.show();
            if (result === true) {
                logger.log(`Window ${window.Id()} shown`);
            }

            if (centerOnMonitor) {
                const monitor = centerOnMonitor === 'primary' ? this._monitorsService.getPrimaryMonitor() : this._monitorsService.getSecondMonitor();
                if (monitor) {
                    await window.centerOnMonitor({ left: monitor.x, top: monitor.y, width: monitor.width, height: monitor.height });
                    logger.log(`Window ${window.Id()} centered on monitor ${monitor.id}`);
                }
            }
            if (dockTo) {
                await window.dock(dockTo);
                logger.log(`Window ${window.Id()} docked to ${dockTo}`);
            }

            await window.bringToFront();
            logger.log(`Window ${window.Id()} brought to front`);
        } catch (error) {
            logger.error('Error showing window:', error);
        }
    }

    private async closeWindow(window: WindowTypes): Promise<void> {
        try {
            await window.close();
            logger.log(`Window ${window.Id()} closed`);
        } catch (error) {
            logger.error('Error closing window:', error);
        }

    }

    private async toggleWindow(window: WindowTypes): Promise<void> {
        if (window) {
            const windowState = await window.getWindowState();
            const isVisible = windowState === overwolf.windows.WindowStateEx.NORMAL ||
                windowState === overwolf.windows.WindowStateEx.MAXIMIZED;

            if (isVisible) {
                await window.hide();
                logger.log('Hiding window by hotkey');
            } else {
                await window.show();
                logger.log('Showing window by hotkey');
            }
        }
    }
}

