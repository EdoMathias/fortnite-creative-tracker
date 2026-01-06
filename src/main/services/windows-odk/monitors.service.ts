import { createLogger } from "../../../shared/services/Logger";

export interface MonitorInfo {
    display: overwolf.utils.Display;
    isPrimary: boolean;
}

const logger = createLogger('MonitorsService');

export class MonitorsService {
    private _monitorsMap: Map<string, MonitorInfo> = new Map();
    private _hasSecondMonitor: boolean = false;
    private _secondMonitor: overwolf.utils.Display | undefined;

    constructor() {
        this.mapMonitors();
    }

    /**
     * Gets the monitors map.
     * @returns The monitors map.
     */
    public getMonitorsMap(): Map<string, MonitorInfo> {
        return this._monitorsMap;
    }

    /**
     * Gets whether there is a second monitor.
     * @returns Whether there is a second monitor.
     */
    public getHasSecondMonitor(): boolean {
        return this._hasSecondMonitor;
    }

    /**
     * Gets the second monitor.
     * @returns The second monitor.
     */
    public getSecondMonitor(): overwolf.utils.Display | undefined {
        return this._secondMonitor;
    }

    /**
     * Gets the primary monitor.
     * @returns The primary monitor.
     */
    public getPrimaryMonitor(): overwolf.utils.Display | undefined {
        return Array.from(this._monitorsMap.values()).find(monitor => monitor.isPrimary)?.display;
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
}

