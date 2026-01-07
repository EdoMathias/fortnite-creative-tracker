import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('AppLaunchService');

/**
 * Handles app launch events triggered by user actions (e.g., clicking the app icon).
 * Game launch events are handled separately by GameStateManager.
 */
export class AppLaunchService {

  constructor(private onLaunchCallback: () => Promise<void>) {
    // Callback to be executed when the app is manually launched.
    overwolf.extensions.onAppLaunchTriggered.addListener(
      (event: AppLaunchTriggeredEvent) => this.handleLaunchEvent(event)
    );
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
    if (event.origin?.includes('gamelaunchevent')) {
      logger.debug('Ignoring game launch event (handled by GameStateManager)');
      return;
    }

    try {
      await this.onLaunchCallback();
    } catch (error) {
      logger.error('Error handling app launch event:', error);
    }
  }

}
