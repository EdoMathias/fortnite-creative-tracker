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
    'terminal_desktop': {
        id: 'terminal_desktop',
        url: 'terminal_desktop.html',
        width: 1600,
        minWidth: 1600,
        height: 800,
        minHeight: 800,
        resizable: true,
    },
    'terminal_ingame': {
        id: 'terminal_ingame',
        url: 'terminal_ingame.html',
        width: 1600,
        height: 800,
        minWidth: 1600,
        minHeight: 800,
        type: OSRType.InGameOnly,
        topMost: true
    }
}

export class WindowsManagerService {
    private _trackMeDesktopWindow: DesktopWindow | undefined;
    private _trackMeIngameWindow: OSRWindow | undefined;

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
    public async createTrackMeDesktopWindow(): Promise<void> {
        if (this._trackMeDesktopWindow && this._trackMeDesktopWindow.isOpen) {
            return;
        } else {
            this._trackMeDesktopWindow = new DesktopWindow(windowsConfigs['terminal_desktop']);
            logger.log('Tracker desktop window created');
        }
    }

    public async showTrackerDesktopWindow(centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        if (!this._trackMeDesktopWindow) {
            await this.createTrackMeDesktopWindow();
        }

        await this.showWindow(this._trackMeDesktopWindow, centerOnMonitor, dockTo);
    }

    public async closeTrackMeDesktopWindow(): Promise<void> {
        await this.closeWindow(this._trackMeDesktopWindow);
    }

    //--------------------------------------------------------------------------
    // Tracker Ingame Window
    public async createTrackMeIngameWindow(): Promise<void> {
        if (this._trackMeIngameWindow && this._trackMeIngameWindow.isOpen) {
            return;
        } else {
            this._trackMeIngameWindow = new OSRWindow(windowsConfigs['terminal_ingame']);
            logger.log('Tracker in-game window created');
        }
    }

    public async showTrackMeIngameWindow(centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        await this.showWindow(this._trackMeIngameWindow, centerOnMonitor, dockTo);
    }

    public async closeTrackMeIngameWindow(): Promise<void> {
        await this.closeWindow(this._trackMeIngameWindow);
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
}

