import { OWGames } from '@overwolf/overwolf-api-ts';
import { kGamesFeatures, TimeRange } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';
import { gameTimeService } from '../../shared/services/GameTimeService';
import { MessageChannel, MessageType } from './MessageChannel';
import { kWindowNames } from '../../shared/consts';

const logger = createLogger('GameEventsService');

import RunningGameInfo = overwolf.games.RunningGameInfo;
import InfoUpdates2Event = overwolf.games.events.InfoUpdates2Event;
import SetRequiredFeaturesResult = overwolf.games.events.SetRequiredFeaturesResult;
import ErrorEvent = overwolf.games.events.ErrorEvent;
import { topMapsStore } from './top-maps/top-maps.store';
import { getTopMaps } from './top-maps/top-maps.facade';

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
  private _activeMapId?: string;
  private _isInLobby: boolean = true;

  constructor(private messageChannel?: MessageChannel) {
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

    overwolf.games.events.getInfo((info) => {
      if (info.res.match_info) {
        const currentMap = JSON.parse(info.res.match_info.creative_map);
        logger.log('Current map', currentMap);

        this.broadcastMapUpdate(currentMap);
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

      // End any active map session
      topMapsStore.stop();
      this._activeMapId = undefined;
      this._isInLobby = true;
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
        logger.log('Game event', event);
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
      if (!info.info) return;

      // ENTER: creative map update
      if (info.feature === "map_info" && (info.info.creative_map as unknown as string)) {
        const currentMap = JSON.parse(info.info.creative_map as unknown as string);
        const mapId = currentMap?.map_id as string | undefined;

        if (mapId) {
          // If map changed, stop previous and start new
          if (this._activeMapId && this._activeMapId !== mapId) {
            topMapsStore.stopIfActiveMapIs(this._activeMapId);
          }

          // Start only if different / not already active
          if (this._activeMapId !== mapId) {
            this._activeMapId = mapId;
            this._isInLobby = false;

            topMapsStore.start(mapId);
            logger.log("Started map session", mapId);
          }

          this.broadcastMapUpdate(currentMap);
          this.broadcastTopMaps('7d');
        }
        return;
      }

      // EXIT: lobby phase
      if (info.feature === "game_info" && (info.info.phase as unknown as string) === "lobby") {
        if (!this._isInLobby) {
          this._isInLobby = true;

          if (this._activeMapId) {
            topMapsStore.stopIfActiveMapIs(this._activeMapId);
            logger.log("Stopped map session (lobby)", this._activeMapId);
            this._activeMapId = undefined;
          }

          this.broadcastMapUpdate(null);
          this.broadcastTopMaps('7d');
        }
        return;
      }
    } catch (error) {
      logger.error("Error handling info update:", error);
    }
  }

  private broadcastMapUpdate(map: any): void {
    if (this.messageChannel) {
      logger.log('Broadcasting map update', map);
      this.messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.MAP_UPDATED,
        map
      ).catch((error) => {
        logger.error('Error broadcasting map update:', error);
      });
    }
  }

  /**
   * Broadcast game time update to tracker windows
   */
  private broadcastGameTimeUpdate(): void {
    if (this.messageChannel) {
      this.messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.GAME_TIME_UPDATED,
        {}
      ).catch((error) => {
        logger.error('Error broadcasting game time update:', error);
      });
    }
  }

  /**
   * Broadcast top maps update to tracker windows
   */
  private broadcastTopMaps(range: TimeRange): void {
    if (!this.messageChannel) return;
  
    const maps = getTopMaps(range /*, metaResolver optional */);
  
    this.messageChannel.broadcastMessage(
      [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
      MessageType.TOP_MAPS_UPDATED,
      { range, maps }
    ).catch(err => logger.error("Error broadcasting top maps:", err));
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

