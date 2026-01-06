import { OWGames, OWGameListener } from '@overwolf/overwolf-api-ts';
import { kGameClassIds } from '../../shared/consts';
import { MessageChannel, MessageType } from './MessageChannel';
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('GameStateManager');

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
export class GameStateManager {
  private _gameListener: OWGameListener;
  private _stateChangeCallback?: (isRunning: boolean, gameInfo?: RunningGameInfo) => Promise<void> | void;
  private _messageChannel: MessageChannel;

  constructor(messageChannel: MessageChannel) {
    this._messageChannel = messageChannel;
    // this._gameListener = new OWGameListener({
    //   onGameStarted: this.handleGameStateChange.bind(this),
    //   onGameEnded: this.handleGameStateChange.bind(this)
    // });

    overwolf.games.onGameInfoUpdated.addListener((event: overwolf.games.GameInfoUpdatedEvent) => {
      this.handleGameStateChange(event);
    });
  }

  /**
   * Registers a callback to be executed when the game state changes (started/ended).
   * 
   * @param callback - Function called with true when game starts, false when game ends
   */
  public setOnGameStateChange(callback: (isRunning: boolean, gameInfo?: RunningGameInfo) => Promise<void> | void): void {
    this._stateChangeCallback = callback;
  }

  /**
   * Starts monitoring for game state changes.
   * Must be called after setting up callbacks.
   */
  public start(): void {
    this._gameListener.start();
    logger.log('Started monitoring game state');
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

  /**
   * Broadcasts game state changes to all app windows.
   * 
   * @param isRunning - Whether the game is currently running
   * @param gameInfo - The game information
   */
  private broadcastGameStateChange(isRunning: boolean, gameInfo: RunningGameInfo): void {
    this._messageChannel.broadcastMessage(
      ['background'],
      MessageType.GAME_STATE_CHANGED,
      {
        isRunning,
        gameInfo: {
          classId: gameInfo.classId,
          title: gameInfo.title,
          isRunning: gameInfo.isRunning
        }
      }
    );
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
    logger.log('Checking if game is supported:', gameInfo.classId);
    return kGameClassIds.includes(gameInfo.classId);
  }

  private executeStateChangeCallback(isRunning: boolean, gameInfo?: RunningGameInfo): void {
    if (!this._stateChangeCallback) {
      return;
    }

    try {
      Promise.resolve(this._stateChangeCallback(isRunning, gameInfo)).catch((error) => {
        logger.error('Error in game state change callback:', error);
      });
    } catch (error) {
      logger.error('Error in game state change callback:', error);
    }
  }
}

