import { WindowManager } from '../services/WindowManager';
import { GameStateManager } from '../services/GameStateManager';
import { HotkeyHandler } from '../services/HotkeyHandler';
import { AppLaunchHandler } from '../services/AppLaunchHandler';
import { MessageChannel, MessageType } from '../services/MessageChannel';
import { GameEventsService } from '../services/GameEventsService';
import { kWindowNames } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';
import { WindowsManagerService } from '../services/windows-odk/windows-manager.service';

const logger = createLogger('BackgroundController');

/**
 * BackgroundController orchestrates all background services.
 * It implements the Singleton pattern to ensure only one instance exists.
 * Uses dependency injection for services.
 */
export class BackgroundController {
  private static _instance: BackgroundController;
  
  private _messageChannel: MessageChannel;
  private _windowManager: WindowManager;
  private _gameStateManager: GameStateManager;
  private _hotkeyHandler: HotkeyHandler;
  private _appLaunchHandler: AppLaunchHandler;
  private _gameEventsService: GameEventsService;

  private _windowsManagerService: WindowsManagerService;

  private _isGameRunning: boolean = false;

  private constructor() {
    // Initialize MessageChannel first (used by other services)
    this._messageChannel = new MessageChannel();
    
    // Initialize services with dependency injection
    this._windowManager = new WindowManager(this._messageChannel);
    this._gameStateManager = new GameStateManager(this._messageChannel);
    this._hotkeyHandler = new HotkeyHandler();
    this._appLaunchHandler = new AppLaunchHandler();
    this._gameEventsService = new GameEventsService(this._messageChannel);
    this._windowsManagerService = new WindowsManagerService();

    // Set up service callbacks
    this._setupGameStateHandlers();
    this._setupHotkeyHandlers();
    this._setupAppLaunchHandlers();
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
    const shouldShowInGame = await this._gameStateManager.isSupportedGameRunning();
    if (shouldShowInGame) {
      await this._windowManager.onGameLaunch();
      await this._gameEventsService.onGameLaunched();
      this._isGameRunning = true;
    } else {
      await this._windowManager.showDesktopWindow();
      this._isGameRunning = false;
    }
  }

  /**
   * Sets up the game state handlers.
   */
  private _setupGameStateHandlers(): void {
    this._gameStateManager.setOnGameStateChange(async (isRunning: boolean, gameInfo?: overwolf.games.RunningGameInfo) => {
      if (isRunning) {
        await this._windowManager.onGameLaunch();
        await this._gameEventsService.onGameLaunched(undefined, gameInfo);
        this._isGameRunning = true;
      } else {
        await this._windowManager.onGameExit();
        this._gameEventsService.onGameClosed();
        this._isGameRunning = false;
      }
    });
  }

  /**
   * Sets up the hotkey handlers.
   */
  private _setupHotkeyHandlers(): void {
    // Toggle the tracker window visibility (show/hide)
    this._hotkeyHandler.setOnShowHideTrackerVisibility(async () => {
      await this._windowManager.toggleTrackerWindowVisibility();
    });

    // Show/Hide desktop window
    this._hotkeyHandler.setOnToggleDesktopWindow(async () => {
      // Only toggle if we're in-game
      if (this._isGameRunning) {
        try {
          await this._windowManager.toggleDesktopWindow();
        } catch (error) {
          logger.error('Error toggling desktop window:', error);
        }
      }
    });

  }

  /**
   * Sets up the app launch handlers.
   */
  private _setupAppLaunchHandlers(): void {
    this._appLaunchHandler.setOnLaunch(async () => {
      if (this._isGameRunning) {
        await this._windowManager.onGameLaunch();
      } else {
        await this._windowManager.showDesktopWindow();
      }
    });
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

  /**
   * Gets the message channel instance (for external access if needed)
   */
  public getMessageChannel(): MessageChannel {
    return this._messageChannel;
  }

  /**
   * Gets the window manager instance (for external access if needed)
   */
  public getWindowManager(): WindowManager {
    return this._windowManager;
  }

  /**
   * Gets the game state manager instance (for external access if needed)
   */
  public getGameStateManager(): GameStateManager {
    return this._gameStateManager;
  }
}

