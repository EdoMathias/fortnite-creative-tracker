import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;
import { createLogger } from '../../services/Logger';

const logger = createLogger('AppLaunchHandler');

/**
 * Handles app launch events triggered by user actions (e.g., clicking the app icon).
 * 
 * Note: Game launch events are handled separately by GameStateManager.
 * This handler only processes manual app launches (user-initiated).
 */
export class AppLaunchHandler {
  private _launchCallback?: () => void;

  constructor() {
    this.setupLaunchListener();
  }

  /**
   * Sets up the listener for app launch events from Overwolf.
   * This fires when the user manually launches the app (not via game launch).
   */
  private setupLaunchListener(): void {
    overwolf.extensions.onAppLaunchTriggered.addListener(
      (event: AppLaunchTriggeredEvent) => this.handleLaunchEvent(event)
    );
  }

  /**
   * Registers a callback to be executed when the app is manually launched.
   * @param callback - Function to call when app is launched by user
   */
  setOnLaunch(callback: () => void): void {
    this._launchCallback = callback;
  }

  /**
   * Handles incoming app launch events.
   * Filters out game launch events and only processes user-initiated launches.
   * 
   * @param event - The app launch event from Overwolf
   */
  private async handleLaunchEvent(event: AppLaunchTriggeredEvent): Promise<void> {
    logger.log('App launch event received:', event);

    // Skip invalid events
    if (!event) {
      logger.warn('Received invalid app launch event');
      return;
    }

    // Skip game launch events (these are handled by GameStateManager)
    if (this.isGameLaunchEvent(event)) {
      logger.debug('Ignoring game launch event (handled by GameStateManager)');
      return;
    }

    // Execute the registered callback for user-initiated launches
    if (this._launchCallback) {
      await this._launchCallback();
    } else {
      logger.warn('App launch event received but no callback is registered');
    }
  }

  /**
   * Determines if an event is a game launch event (vs user-initiated launch).
   * Game launch events are handled by GameStateManager, not this handler.
   * 
   * @param event - The app launch event to check
   * @returns true if this is a game launch event
   */
  private isGameLaunchEvent(event: AppLaunchTriggeredEvent): boolean {
    return event.origin?.includes('gamelaunchevent') ?? false;
  }
}