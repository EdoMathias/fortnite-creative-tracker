import { OWGames } from '@overwolf/overwolf-api-ts';
import { kGamesFeatures } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';
import { gameTimeService } from '../../shared/services/GameTimeService';
import { MessageChannel, MessageType } from './MessageChannel';
import { kWindowNames } from '../../shared/consts';

const logger = createLogger('GameEventsService');

import RunningGameInfo = overwolf.games.RunningGameInfo;
import InfoUpdates2Event = overwolf.games.events.InfoUpdates2Event;
import SetRequiredFeaturesResult = overwolf.games.events.SetRequiredFeaturesResult;
import ErrorEvent = overwolf.games.events.ErrorEvent;

export interface GEPEnabledFeatures {
  enabled: string[];
  requested: string[];
}

export interface GEPErrorPayload {
  reason: string;
}

export interface GameEventPayload {
  events: any[];
}

export interface InfoUpdatePayload {
  feature: string;
  info: { [categoryKey: string]: { [key: string]: any } };
}

/**
 * Handles registration for Overwolf game events once a supported game launches.
 */
export class GameEventsService {
  protected enabledFeatures: GEPEnabledFeatures = {
    enabled: [],
    requested: [],
  };

  private _currentGameClassId?: number;
  private _messageChannel?: MessageChannel;

  constructor(messageChannel?: MessageChannel) {
    this._messageChannel = messageChannel;
  }

  /**
   * Handles all GEP-related logic when a game is launched
   *
   * It is possible to register all listeners once when starting the app, and
   * then only de-register them when closing the app (if at all). We choose
   * to register/deregister them for every game, mostly just to show how.
   *
   * @param {string[] | undefined} requiredFeatures
   * - Optional list of required features. If not provided, will try to get from game classId
   * @param {RunningGameInfo | undefined} gameInfo
   * - Optional game info. If not provided, will try to resolve it
   * @returns {Promise<GEPEnabledFeatures | undefined>}
   * A promise resolving to the features that were successfully set,
   * or to nothing if this is a GEP SDK game
   * @throws Error if setting the required features failed too many times
   * (native GEP only)
   */
  public async onGameLaunched(
    requiredFeatures?: string[],
    gameInfo?: RunningGameInfo,
  ): Promise<GEPEnabledFeatures | undefined> {
    logger.log('Registering GEP listeners');
    this.startGEPListeners();

    // Resolve game info if not provided
    const resolvedGameInfo = await this.resolveRunningGameInfo(gameInfo);
    if (!resolvedGameInfo) {
      logger.warn('Game launch detected but no running game info available');
      return undefined;
    }

    this._currentGameClassId = resolvedGameInfo.classId;

    // Get required features if not provided
    const features = requiredFeatures || this.getRequiredFeatures(resolvedGameInfo.classId);
    
    if (features.length === 0) {
      logger.debug('No required features defined for classId', resolvedGameInfo.classId);
      return undefined;
    }

    logger.log('Registering required features');
    this.enabledFeatures = await this.setRequiredFeatures(features, 30);
    
    // Check current scene state if app launched while game is already running
    // getInfo sometimes returns the current scene when called after features are set
    overwolf.games.events.getInfo((info) => {
      // Try to extract current scene from getInfo result
      const currentScene = this.extractSceneFromInfo(info);
      if (currentScene) {
        logger.log(`Found current scene from getInfo: "${currentScene}"`);
        
        // Update game time tracking based on current scene
        try {
          gameTimeService.reloadData();
          gameTimeService.resetSessionRaids(); // Reset session raids when game launches
          this.handleSceneChange(currentScene);
        } catch (error) {
          logger.error('Error updating scene from getInfo:', error);
          // Fallback to lobby if there's an error
          gameTimeService.resetSessionRaids(); // Reset session raids when game launches
          gameTimeService.startSession('lobby');
          this.broadcastGameTimeUpdate();
        }
      } else {
        // No scene found, assume lobby state initially
        try {
          gameTimeService.reloadData();
          gameTimeService.resetSessionRaids(); // Reset session raids when game launches
          gameTimeService.startSession('lobby');
          logger.debug('Started lobby session tracking (default)');
          this.broadcastGameTimeUpdate();
        } catch (error) {
          logger.error('Error starting game time tracking:', error);
        }
      }
    });

    return this.enabledFeatures;
  }

  /**
   * Run cleanup logic for when a game was closed
   *
   * @returns {boolean} - True if de-registering the listeners was successful
   */
  public onGameClosed(): boolean {
    logger.log('Cleaning up GEP logic');
    
    // End game time tracking session
    try {
      gameTimeService.onGameTerminated();
      logger.debug('Ended game time tracking session - stopped counting time');
      this.broadcastGameTimeUpdate();
    } catch (error) {
      logger.error('Error ending game time tracking:', error);
    }

    this.enabledFeatures = {
      enabled: [],
      requested: [],
    };
    
    this._currentGameClassId = undefined;
    return this.stopGEPListeners();
  }

  /**
   * Attempts to set the required features for this specific game
   *
   * @param {string[]} requiredFeatures
   * - An array containing the required features for this game
   * @param {number} maxRetries
   * - Maximum number of retry attempts
   * @returns {Promise<GEPEnabledFeatures>}
   * A promise resolving to the features that were successfully set
   * @throws {string} The error message given if the features failed to be set
   */
  protected async setRequiredFeatures(
    requiredFeatures: string[],
    maxRetries: number = 30,
  ): Promise<GEPEnabledFeatures> {
    let tries = 1;

    while (tries <= maxRetries) {
      try {
        const supportedFeatures = await this.trySetRequiredFeatures(requiredFeatures);
        
        if (supportedFeatures.length > 0) {
          logger.log('Registered required features', supportedFeatures);
          // Note: getInfo is called in onGameLaunched after features are set
          // to check for current scene state
          
          return {
            enabled: supportedFeatures,
            requested: requiredFeatures,
          };
        }
      } catch (error) {
        const errorMessage = error as string;
        logger.warn(`Attempt ${tries}/${maxRetries} failed:`, errorMessage);
        
        if (tries >= maxRetries) {
          throw new Error(`Failed to set required features after ${maxRetries} attempts: ${errorMessage}`);
        }
      }

      // Wait 3 sec before retry
      await this.delay(3000);
      tries++;
    }

    throw new Error(`Failed to set required features after ${maxRetries} attempts`);
  }

  /**
   * Attempts to set the required features for this specific game
   *
   * @param {string[]} requiredFeatures
   * - An array containing the required features for this game
   * @returns {Promise<string[]>}
   * A promise resolving to the features that were successfully set
   * @throws {string} The error message given if the features failed to be set
   */
  protected async trySetRequiredFeatures(
    requiredFeatures: string[],
  ): Promise<string[]> {
    let registered: (result: string[]) => void;
    let failed: (reason: string) => void;

    // Create a promise, and save its resolve/reject callbacks
    const promise: Promise<string[]> = new Promise(function (resolve, reject) {
      registered = resolve;
      failed = reject;
    });

    // Try to set the required features
    overwolf.games.events.setRequiredFeatures(requiredFeatures, (result) => {
      // If features failed to be set
      if (!result.success) {
        // Fail the current attempt with the error message
        return failed(result.error as string);
      }

      // Approve the current attempt, and return the list of set features
      registered(result.supportedFeatures as string[]);
    });

    // Return the dummy promise
    return promise;
  }

  private errorListener = (error: ErrorEvent) => {
    // Convert ErrorEvent to GEPErrorPayload format
    const gepError: GEPErrorPayload = {
      reason: (error as any).error || (error as any).reason || String(error)
    };
    this.onErrorListener(gepError);
  };

  private eventsListener = (events: any) => {
    // Convert to GameEventPayload format
    // onNewEvents provides: { events: [...] }
    const gameEvents: GameEventPayload = {
      events: events?.events || events || []
    };
    this.onGameEventListener(gameEvents);
  };

  private infoListener = (info: InfoUpdates2Event) => {
    // Convert InfoUpdates2Event to InfoUpdatePayload format
    // InfoUpdates2Event structure: { info: { [feature]: { [category]: { [key]: value } } } }
    if (!info || !info.info) {
      return;
    }

    // Iterate through each feature in the info object
    Object.keys(info.info).forEach((featureKey) => {
      const featureData = (info.info as any)[featureKey];
      
      const infoUpdate: InfoUpdatePayload = {
        feature: featureKey,
        info: featureData || {}
      };
      
      this.onInfoUpdateListener(infoUpdate);
    });
  };

  /**
   * Register all GEP listeners
   *
   * @returns {boolean} - True if registering the listeners was successful
   */
  public startGEPListeners(): boolean {
    try {
      // Register errors listener
      overwolf.games.events.onError.addListener(this.errorListener);

      // Register Info Update listener
      overwolf.games.events.onInfoUpdates2.addListener(this.infoListener);

      // Register Game event listener
      overwolf.games.events.onNewEvents.addListener(this.eventsListener);

      logger.log('GEP listeners registered');
      return true;
    } catch (error) {
      logger.error('Error registering listeners:', error);
      return false;
    }
  }

  /**
   * De-register all GEP listeners
   *
   * @returns {boolean} - True if de-registering the listeners was successful
   */
  public stopGEPListeners(): boolean {
    overwolf.games.events.onError.removeListener(this.errorListener);
    overwolf.games.events.onInfoUpdates2.removeListener(this.infoListener);
    overwolf.games.events.onNewEvents.removeListener(this.eventsListener);
    return true;
  }

  /**
   * Handle error events from GEP
   */
  protected onErrorListener(error: GEPErrorPayload): void {
    logger.error(`GEP Error: ${error.reason}`);
  }

  /**
   * Handle game events from onNewEvents listener
   * Events come in format: {feature, category, key, value}
   */
  protected onGameEventListener(events: GameEventPayload): void {
    try {
      if (!events.events || !Array.isArray(events.events) || events.events.length === 0) {
        return;
      }

      events.events.forEach((event: any) => {
        // Handle different event structures:
        // 1. New format: {name: 'match_start', data: ''}
        // 2. Old format: {feature: 'game_info', category: 'game_info', key: 'scene', value: 'ingame'}
        
        if (event && event.name) {
          // New event format with name
          logger.debug(`Game event: name="${event.name}"`);
          
          // Handle match_start event - indicates entering a raid
          if (event.name === 'match_start') {
            logger.log('Match start event detected');
            this.handleMatchStart();
          }
          // Handle match_end event - indicates exiting a raid
          else if (event.name === 'match_end') {
            logger.log('Match end event detected');
            this.handleMatchEnd();
          }
        } else if (event && 
            event.feature === 'game_info' && 
            event.category === 'game_info' && 
            event.key === 'scene') {
          // Old event format with feature/category/key
          const scene = event.value;
          logger.log(`Scene change detected from game event: ${scene}`);
          this.handleSceneChange(scene);
        }
      });
    } catch (error) {
      logger.error('Error handling game event:', error);
    }
  }

  /**
   * Handle info updates from onInfoUpdates2 listener
   * Detects scene changes from game_info events in InfoUpdates2Event
   * Structure: info.info can be either:
   * - Flat: {scene: 'ingame'} (direct keys)
   * - Nested: {game_info: {scene: 'ingame'}} (category-based)
   */
  protected onInfoUpdateListener(info: InfoUpdatePayload): void {
    try {
      if (!info.info) {
        return;
      }

      // Check if info.info has nested structure (category-based) or flat structure (direct keys)
      const firstKey = Object.keys(info.info)[0];
      const firstValue = info.info[firstKey];
      
      // If the first value is an object, it's likely nested structure: {category: {key: value}}
      // Otherwise, it's flat structure: {key: value}
      const isNested = firstValue && typeof firstValue === 'object' && !Array.isArray(firstValue);
      
      if (isNested) {
        // Nested structure: info.info[categoryKey][key]
        Object.keys(info.info).forEach((categoryKey) => {
          const category = info.info[categoryKey];
          
          if (!category || typeof category !== 'object' || Array.isArray(category)) {
            return;
          }
          
          // Iterate through each key in the category
          Object.keys(category).forEach((key) => {
            const data = category[key];
            
            // Check if this is a game_info scene update
            if (info.feature === 'game_info' && 
                categoryKey === 'game_info' && 
                key === 'scene') {
              const scene = data;
              logger.log(`Scene change detected from info update: ${scene}`);
              this.handleSceneChange(scene);
            }
          });
        });
      } else {
        // Flat structure: info.info[key] (direct keys)
        Object.keys(info.info).forEach((key) => {
          const data = info.info[key];
          
          // Check if this is a game_info scene update (flat structure)
          if (info.feature === 'game_info' && key === 'scene') {
            const scene = typeof data === 'string' ? data : String(data);
            logger.log(`Scene change detected from info update: ${scene}`);
            this.handleSceneChange(scene);
          }
        });
      }
    } catch (error) {
      logger.error('Error handling game state change:', error);
    }
  }

  /**
   * Extract scene from getInfo result
   * Handles various structures that getInfo might return
   * 
   * @param info - The result from overwolf.games.events.getInfo
   * @returns The scene string if found, null otherwise
   */
  private extractSceneFromInfo(info: any): string | null {
    if (!info) {
      return null;
    }

    try {
      // Structure 1: info.res.game_info.scene
      if (info.res?.game_info?.scene) {
        return String(info.res.game_info.scene);
      }

      // Structure 2: info.game_info.scene
      if (info.game_info?.scene) {
        return String(info.game_info.scene);
      }

      // Structure 3: info.res.game_info (flat structure with scene key)
      if (info.res?.game_info) {
        const gameInfo = info.res.game_info;
        if (gameInfo.scene) {
          return String(gameInfo.scene);
        }
      }

      // Structure 4: Direct scene in info
      if (info.scene) {
        return String(info.scene);
      }

      // Structure 5: Check in info.res directly
      if (info.res?.scene) {
        return String(info.res.scene);
      }

      // Structure 6: Check nested in info.res (if it's an object with game_info)
      if (info.res && typeof info.res === 'object') {
        // Try to find scene in any nested structure
        for (const key in info.res) {
          if (info.res[key] && typeof info.res[key] === 'object') {
            if (info.res[key].scene) {
              return String(info.res[key].scene);
            }
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error extracting scene from getInfo:', error);
      return null;
    }
  }

  /**
   * Track the last scene we processed to detect summary->lobby transitions
   */
  private _lastScene?: string;

  /**
   * Handle scene change and update game time tracking
   * - "ingame" = in raid
   * - "lobby" or "summary" = in lobby
   * 
   * Special case: If transitioning from "summary" to "lobby", don't reset time tracking
   * as they're both part of the same lobby session
   */
  private handleSceneChange(scene: string): void {
    if (scene === 'ingame') {
      gameTimeService.startSession('raid');
      logger.debug('Started raid session (from scene change)');
      this._lastScene = scene;
      this.broadcastGameTimeUpdate();
    } else if (scene === 'lobby') {
      // If we're transitioning from "summary" to "lobby", don't reset the session
      // Both summary and lobby are part of the same lobby session
      if (this._lastScene === 'summary') {
        // Transitioning from summary to lobby - don't reset, just continue lobby session
        logger.debug('Transitioning from summary to lobby - continuing lobby session (no reset)');
        this._lastScene = scene;
        this.broadcastGameTimeUpdate();
      } else {
        // Starting new lobby session (not from summary)
        gameTimeService.startSession('lobby');
        logger.debug('Started lobby session (from scene change)');
        this._lastScene = scene;
        this.broadcastGameTimeUpdate();
      }
    } else if (scene === 'summary') {
      // Summary is part of lobby session, so start/continue lobby session
      // Only start if we're not already in lobby (check by seeing if last scene was lobby)
      if (this._lastScene !== 'lobby' && this._lastScene !== 'summary') {
        gameTimeService.startSession('lobby');
        logger.debug('Started lobby session (from summary scene)');
      } else {
        logger.debug('Continuing lobby session (summary scene)');
      }
      this._lastScene = scene;
      this.broadcastGameTimeUpdate();
    }
  }

  /**
   * Handle match_start event - fallback method for detecting raid start
   * This is called when match_start event is received, indicating entering a raid
   */
  private handleMatchStart(): void {
    try {
      gameTimeService.startSession('raid');
      logger.log('Started raid session (from match_start event)');
      this.broadcastGameTimeUpdate();
    } catch (error) {
      logger.error('Error starting raid session from match_start:', error);
    }
  }

  /**
   * Handle match_end event - fallback method for detecting raid end
   * This is called when match_end event is received, indicating exiting a raid
   */
  private handleMatchEnd(): void {
    try {
      // When match ends, we're back in lobby
      gameTimeService.startSession('lobby');
      logger.log('Ended raid session, started lobby session (from match_end event)');
      this.broadcastGameTimeUpdate();
    } catch (error) {
      logger.error('Error handling match_end event:', error);
    }
  }

  /**
   * Broadcast game time update to tracker windows
   */
  private broadcastGameTimeUpdate(): void {
    if (this._messageChannel) {
      this._messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.GAME_TIME_UPDATED,
        {}
      ).catch((error) => {
        logger.error('Error broadcasting game time update:', error);
      });
    }
  }

  private async resolveRunningGameInfo(gameInfo?: RunningGameInfo): Promise<RunningGameInfo | undefined> {
    if (gameInfo?.isRunning) {
      return gameInfo;
    }

    try {
      const info = await OWGames.getRunningGameInfo();
      if (info?.isRunning) {
        return info;
      }
    } catch (error) {
      logger.error('Failed to fetch running game info', error);
    }

    return undefined;
  }

  private getRequiredFeatures(classId?: number): string[] {
    if (!classId) {
      return [];
    }

    return kGamesFeatures.get(classId) ?? [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

