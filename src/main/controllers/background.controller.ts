import { GameStateService } from '../services/game-state.service';
import { HotkeysService } from '../services/hotkeys.service';
import { AppLaunchService } from '../services/app-launch.service';
import { MessageChannel, MessageType, MessagePayload } from '../services/MessageChannel';
import { GameEventsService } from '../services/game-events.service';
import { kHotkeys, kWindowNames, TimeRange } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';
import { WindowsController } from './windows.controller';
import { topMapsStore } from '../services/top-maps/top-maps.store';
import { getTopMaps } from '../services/top-maps/top-maps.facade';
import { getDashboardData, getLibraryData, getOverviewStats } from '../services/top-maps/dashboard-data.facade';
import { gameTimeService } from '../../shared/services/GameTimeService';

const logger = createLogger('BackgroundController');

/**
 * BackgroundController orchestrates all background services.
 * It implements the Singleton pattern to ensure only one instance exists.
 * Uses dependency injection for services.
 */
export class BackgroundController {
  private static _instance: BackgroundController;

  private _messageChannel: MessageChannel;
  private _windowsController: WindowsController;
  private _gameStateService: GameStateService;
  private _hotkeysService: HotkeysService;
  private _appLaunchService: AppLaunchService;
  private _gameEventsService: GameEventsService;

  private _isGameRunning: boolean = false;
  private _gameTimeBroadcastInterval: number | null = null;

  private constructor() {
    // Initialize MessageChannel first (used by other services)
    this._messageChannel = new MessageChannel();
    this._hotkeysService = new HotkeysService();
    this._appLaunchService = new AppLaunchService(() => this.handleAppLaunch());
    this._gameStateService = new GameStateService(
      this._messageChannel,
      (isRunning, gameInfo) => this.handleGameStateChange(isRunning, gameInfo)
    );
    this._gameEventsService = new GameEventsService(this._messageChannel);
    this._windowsController = new WindowsController(this._messageChannel);

    // Set up service callbacks
    this.setupHotkeyHandlers();
    this.setupMessageHandlers();
  }

  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }
    return BackgroundController._instance;
  }

  /**
   * Starts the background controller and initializes all services
   */
  public async run(): Promise<void> {
    // Initialize the top maps store (handles localStorage migration)
    await topMapsStore.init();
    topMapsStore.recover();

        // Subscribe to store changes and broadcast updated top-maps to renderer windows
        topMapsStore.onChange(() => {
          try {
            const ranges: Array<import('../../shared/consts').TimeRange> = ['today', '7d', 'all'];
            ranges.forEach(range => {
              const maps = getTopMaps(range as any);
              this._messageChannel.broadcastMessage(
                [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
                MessageType.TOP_MAPS_UPDATED,
                { range, maps }
              ).catch(err => logger.error('Error broadcasting top maps on change:', err));
            });
          } catch (err) {
            logger.error('Error preparing top maps update on store change:', err);
          }
        });

        // Start periodic game time broadcasts when session is active
        this.startGameTimeBroadcasts();

    // Determine which window to show based on game state
    const shouldShowInGame = await this._gameStateService.isSupportedGameRunning();
    if (shouldShowInGame) {
      await this._windowsController.onGameLaunch();
      await this._gameEventsService.onGameLaunched();
      this._isGameRunning = true;
    } else {
      // Change later to primary
      await this._windowsController.showTrackerDesktopWindow('secondary');
      this._isGameRunning = false;
    }
  }

  /**
   * Handles game state changes (game launched/terminated).
   */
  private async handleGameStateChange(isRunning: boolean, gameInfo?: overwolf.games.RunningGameInfo): Promise<void> {
    if (isRunning) {
      await this._windowsController.onGameLaunch();
      await this._gameEventsService.onGameLaunched(undefined, gameInfo);
      this._isGameRunning = true;
      this.startGameTimeBroadcasts();
    } else {
      // Stop periodic broadcasts first
      this.stopGameTimeBroadcasts();
      
      // Change later to primary
      await this._windowsController.showTrackerDesktopWindow('secondary');
      
      // End game time tracking and broadcast final update
      this._gameEventsService.onGameClosed();
      
      // Send a final game time update after a brief delay to ensure gameTimeService has finished saving
      // This ensures widgets stop showing live time and display the final totals
      setTimeout(() => {
        this._messageChannel.broadcastMessage(
          [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
          MessageType.GAME_TIME_UPDATED,
          {}
        ).catch(err => logger.error('Error broadcasting final game time update:', err));
      }, 100);
      
      this._isGameRunning = false;
    }
  }

  /**
   * Sets up the hotkey handlers.
   */
  private setupHotkeyHandlers(): void {
    // Show/Hide Desktop Tracker Window
    this._hotkeysService.on(kHotkeys.toggleTrackerDesktopWindow, async () => {
      try {
        await this._windowsController.toggleTrackerDesktopWindow();
      } catch (error) {
        logger.error('Error toggling desktop tracker window:', error);
      }
    });

    // Show/Hide In-Game Tracker Window
    this._hotkeysService.on(kHotkeys.toggleTrackerIngameWindow, async () => {
      try {
        await this._windowsController.toggleTrackerIngameWindow();
      } catch (error) {
        logger.error('Error toggling in-game tracker window:', error);
      }
    });

  }

  /** 
   * Handles user-initiated app launches (clicking the app icon). 
   */
  private async handleAppLaunch(): Promise<void> {
    if (this._isGameRunning) {
      await this._windowsController.onGameLaunch();
    } else {
      // Change later to primary
      await this._windowsController.showTrackerDesktopWindow('secondary');
    }
  }

  /**
   * Sets up message handlers for window-related messages
   */
  private setupMessageHandlers(): void {
    // Listen for window state changes from other windows
    this._messageChannel.onMessage(MessageType.TRACKER_WINDOW_SWITCHED, (payload) => {
      logger.debug('Window switched:', payload);
    });

    // Handle top maps data requests
    this._messageChannel.onMessage(MessageType.TOP_MAPS_REQUEST, (payload: MessagePayload) => {
      const range = (payload.data?.range as TimeRange) ?? '7d';
      logger.debug('Top maps request received:', range);
      
      const maps = getTopMaps(range);
      
      // Broadcast to both tracker windows
      this._messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.TOP_MAPS_UPDATED,
        { range, maps }
      ).catch(err => logger.error('Error broadcasting top maps:', err));
    });

    // Handle dashboard data requests
    this._messageChannel.onMessage(MessageType.DASHBOARD_REQUEST, (payload: MessagePayload) => {
      const range = (payload.data?.range as TimeRange) ?? '7d';
      logger.debug('Dashboard request received:', range);
      
      const data = getDashboardData(range);
      
      this._messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.DASHBOARD_UPDATED,
        { range, ...data }
      ).catch(err => logger.error('Error broadcasting dashboard data:', err));
    });

    // Handle library data requests
    this._messageChannel.onMessage(MessageType.LIBRARY_REQUEST, () => {
      logger.debug('Library request received');
      
      const data = getLibraryData();
      
      this._messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.LIBRARY_UPDATED,
        { maps: data }
      ).catch(err => logger.error('Error broadcasting library data:', err));
    });

    // Handle overview stats requests
    this._messageChannel.onMessage(MessageType.OVERVIEW_REQUEST, () => {
      logger.debug('Overview request received');
      
      const stats = getOverviewStats();
      
      this._messageChannel.broadcastMessage(
        [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
        MessageType.OVERVIEW_UPDATED,
        stats
      ).catch(err => logger.error('Error broadcasting overview stats:', err));
    });

    // Note: MAP_UPDATED is broadcast FROM background, not received here
    // Data refreshes are triggered directly in GameEventsService when sessions end
  }

  /**
   * Start periodic game time broadcasts when a session is active
   */
  private startGameTimeBroadcasts(): void {
    this.stopGameTimeBroadcasts(); // Clear any existing interval
    
    // Broadcast game time updates every 2 seconds when session is active
    this._gameTimeBroadcastInterval = window.setInterval(() => {
      const stats = gameTimeService.getGameTimeStats();
      // Only broadcast if there's an active session
      if (stats.currentScene) {
        this._messageChannel.broadcastMessage(
          [kWindowNames.trackerDesktop, kWindowNames.trackerIngame],
          MessageType.GAME_TIME_UPDATED,
          {}
        ).catch(err => logger.error('Error broadcasting game time update:', err));
      }
    }, 2000);
  }

  /**
   * Stop periodic game time broadcasts
   */
  private stopGameTimeBroadcasts(): void {
    if (this._gameTimeBroadcastInterval !== null) {
      clearInterval(this._gameTimeBroadcastInterval);
      this._gameTimeBroadcastInterval = null;
    }
  }

}