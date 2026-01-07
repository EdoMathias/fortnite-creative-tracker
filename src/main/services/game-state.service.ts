import { OWGames } from '@overwolf/overwolf-api-ts';
import { kGameClassIds } from '../../shared/consts';
import { MessageChannel } from './MessageChannel';
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('GameStateService');

import RunningGameInfo = overwolf.games.RunningGameInfo;

/**
 * Manages game state detection and monitoring for supported games.
 * 
 * This service:
 * - Listens for game start/end events
 * - Checks if a supported game is currently running
 * - Broadcasts game state changes to all windows via MessageChannel
 * - Notifies the controller when game state changes
 */
export class GameStateService {
  constructor(
    private messageChannel: MessageChannel,
    private onStateChange: (isRunning: boolean, gameInfo?: RunningGameInfo) => Promise<void>
  ) {
    overwolf.games.onGameInfoUpdated.addListener((event: overwolf.games.GameInfoUpdatedEvent) => {
      this.handleGameStateChange(event);
    });
  }

  /**
   * Checks if a supported game is currently running.
   * 
   * @returns Promise that resolves to true if a supported game is running
   */
  public async isSupportedGameRunning(): Promise<boolean> {
    try {
      const gameInfo = await OWGames.getRunningGameInfo();

      if (!gameInfo) {
        return false;
      }

      const isRunning = gameInfo.isRunning && this.isSupportedGame(gameInfo);
      return isRunning;
    } catch (error) {
      logger.error('Error checking game state:', error);
      return false;
    }
  }

  /**
   * Handles game state change events (game started or ended).
   * Only processes events for supported games.
   * 
   * @param event - The game information from the event
   */
  private handleGameStateChange(event: overwolf.games.GameInfoUpdatedEvent): void {
    // Ignore events for unsupported games or invalid events
    if (!event) {
      logger.debug('Invalid game state change event:', event);
      return;
    }

    //@ts-ignore
    if (event.reason[0] === 'gameLaunched') {
      this.handleGameLaunched(event);
      //@ts-ignore
    } else if (event.reason[0] === 'gameTerminated') {
      this.handleGameTerminated(event);
    }
  }

  private handleGameLaunched(event: overwolf.games.GameInfoUpdatedEvent): void {
    if (!this.isSupportedGame(event.gameInfo)) {
      logger.debug('Ignoring game state change for unsupported game:', event.gameInfo?.classId);
      return;
    }

    this.executeStateChangeCallback(true, event.gameInfo);
  }

  private handleGameTerminated(event: overwolf.games.GameInfoUpdatedEvent): void {
    this.executeStateChangeCallback(false, event.gameInfo);
  }

  //-------------------------- Helper functions --------------------------------
  /**
   * Determines if the given game is in our list of supported games.
   * @param gameInfo - The game information to check
   * @returns true if the game is supported
   */
  private isSupportedGame(gameInfo: RunningGameInfo): boolean {
    if (kGameClassIds.includes(gameInfo.classId)) {
      logger.log('Game is supported:', gameInfo.classId);
      return true;
    } else {
      logger.error('Game is not supported:', gameInfo.classId);
      return false;
    }
  }

  private async executeStateChangeCallback(isRunning: boolean, gameInfo?: RunningGameInfo): Promise<void> {
    try {
      await this.onStateChange(isRunning, gameInfo);
    } catch (error) {
      logger.error('Error in game state change callback:', error);
    }
  }
}

