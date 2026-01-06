import { WindowManager } from '../services/WindowManager';
import { GameStateManager } from '../services/GameStateManager';
import { HotkeysService } from '../services/hotkeys.service';
import { AppLaunchHandler } from '../services/AppLaunchHandler';
import { MessageChannel, MessageType } from '../services/MessageChannel';
import { GameEventsService } from '../services/GameEventsService';
import { kHotkeys, kWindowNames } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';
import { WindowsService } from '../services/windows-odk/windows.service';
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
  private _gameStateManager: GameStateManager;
  private _hotkeysService: HotkeysService;
  private _appLaunchHandler: AppLaunchHandler;
  private _gameEventsService: GameEventsService;

  private _isGameRunning: boolean = false;

  private constructor() {
    // Initialize MessageChannel first (used by other services)
    this._messageChannel = new MessageChannel();

    // Initialize services with dependency injection
    this._gameStateManager = new GameStateManager(this._messageChannel);
    this._hotkeysService = new HotkeysService();
    this._appLaunchHandler = new AppLaunchHandler();
    // this._gameEventsService = new GameEventsService(this._messageChannel);
    this._windowsController = new WindowsController(this._messageChannel);

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
      await this._windowsController.onGameLaunch();
      await this._gameEventsService.onGameLaunched();
      this._isGameRunning = true;
    } else {
      await this._windowsController.showTrackerDesktopWindow('primary');
      this._isGameRunning = false;
    }
  }

  /**
   * Sets up the game state handlers.
   */
  private _setupGameStateHandlers(): void {
    this._gameStateManager.setOnGameStateChange(async (isRunning: boolean, gameInfo?: overwolf.games.RunningGameInfo) => {
      if (isRunning) {
        await this._windowsController.onGameLaunch();
        await this._gameEventsService.onGameLaunched(undefined, gameInfo);
        this._isGameRunning = true;
      } else {
        await this._windowsController.showTrackerDesktopWindow('primary');
        this._gameEventsService.onGameClosed();
        this._isGameRunning = false;
      }
    });
  }

  /**
   * Sets up the hotkey handlers.
   */
  private _setupHotkeyHandlers(): void {
    // Show/Hide Desktop Tracker Window
    this._hotkeysService.on(kHotkeys.toggleTrackerDesktopWindow, async () => {
      await this._windowsController.toggleTrackerDesktopWindow();
    });

    // Show/Hide In-Game Tracker Window
    this._hotkeysService.on(kHotkeys.toggleTrackerIngameWindow, async () => {
      await this._windowsController.toggleTrackerIngameWindow();
    });

  }

  /**
   * Sets up the app launch handlers.
   */
  private _setupAppLaunchHandlers(): void {
    this._appLaunchHandler.setOnLaunch(async () => {
      if (this._isGameRunning) {
        // await this._windowManager.onGameLaunch();
      } else {
        // await this._windowManager.showDesktopWindow();
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
}