import { GameStateService } from '../services/game-state.service';
import { HotkeysService } from '../services/hotkeys.service';
import { AppLaunchService } from '../services/app-launch.service';
import { MessageChannel, MessageType } from '../services/MessageChannel';
import { GameEventsService } from '../services/game-events.service';
import { kHotkeys } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';
import { WindowsController } from './windows.controller';

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
      // await this._gameEventsService.onGameLaunched(undefined, gameInfo);
      this._isGameRunning = true;
    } else {
      // Change later to primary
      await this._windowsController.showTrackerDesktopWindow('secondary');
      // this._gameEventsService.onGameClosed();
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
  }
}