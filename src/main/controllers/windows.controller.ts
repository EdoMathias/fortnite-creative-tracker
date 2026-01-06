import { kWindowNames } from '../../shared/consts';
import { MessageChannel, MessageType } from '../services/MessageChannel';
import { createLogger } from '../../shared/services/Logger';
import { MonitorInfo, MonitorsService } from '../services/windows-odk/monitors.service';
import { WindowsService } from '../services/windows-odk/windows.service';
import { Edge } from '@overwolf/odk-ts/window/enums/edge';

const logger = createLogger('WindowsController');

export class WindowsController {
    private _messageChannel: MessageChannel;
    private _windowsService: WindowsService;
    private _monitorsService: MonitorsService;

    constructor(messageChannel: MessageChannel) {
        this._messageChannel = messageChannel;
        this._windowsService = new WindowsService();
        this._monitorsService = new MonitorsService();
    }

    public async onGameLaunch(): Promise<void> {
        // if has second monitor, show the tracker window on the second monitor
        if (this._monitorsService.hasSecondMonitor()) {
            await this._windowsService.showTrackerDesktopWindow('secondary');
            logger.log('Moving tracker desktop window to secondary monitor');
        }

        // Create the in-game tracker window but don't show it yet
        await this._windowsService.createTrackerIngameWindow();
    }

    public async onGameExit(): Promise<void> {
        // Close the in-game tracker window
        await this._windowsService.closeTrackerIngameWindow();

        // Move the desktop tracker window to the center of the main monitor
        await this._windowsService.showTrackerDesktopWindow('primary');
    }

    public async showTrackerDesktopWindow(centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        await this._windowsService.showTrackerDesktopWindow(centerOnMonitor, dockTo);
    }

    public async showTrackerIngameWindow(centerOnMonitor?: 'primary' | 'secondary', dockTo?: Edge): Promise<void> {
        await this._windowsService.showTrackerIngameWindow(centerOnMonitor, dockTo);
    }

    public async toggleTrackerDesktopWindow(): Promise<void> {
        await this._windowsService.toggleTrackerDesktopWindow();
    }

    public async toggleTrackerIngameWindow(): Promise<void> {
        await this._windowsService.toggleTrackerIngameWindow();
    }
}

