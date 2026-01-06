import { HotkeyData, kHotkeys } from '../../consts';
import { createLogger } from '../../services/Logger';

const logger = createLogger('HotkeysService');

/**
 * HotkeysService manages all hotkey operations using Overwolf API
 * Stores hotkeys internally after fetching them
 */
export class HotkeysService {
  private static _instance: HotkeysService;
  private _hotkeys: Map<string, HotkeyData> = new Map();
  private _isInitialized: boolean = false;

  private constructor() {
    this.initialize();
  }

  public static instance(): HotkeysService {
    if (!HotkeysService._instance) {
      HotkeysService._instance = new HotkeysService();
    }
    return HotkeysService._instance;
  }

  /**
   * Initializes the service by fetching all hotkeys
   */
  private initialize(): void {
    if (this._isInitialized) {
      return;
    }

    this.fetchAllHotkeys();
    
    // Listen for hotkey changes to keep the cache updated
    overwolf.settings.hotkeys.onChanged.addListener(() => {
      this.fetchAllHotkeys();
    });

    this._isInitialized = true;
  }

  public updateHotkey(hotkeyObject: HotkeyData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Unassign the old hotkey (if it exists)
      // If unassign fails (e.g., hotkey not found), we still proceed to assign
      overwolf.settings.hotkeys.unassign({ name: hotkeyObject.name }, (unassignResult) => {
        if (!unassignResult.success) {
          // Log but don't fail - hotkey might not be assigned yet
          logger.log('Hotkey not found for unassign (this is OK if hotkey was never assigned):', hotkeyObject.name, unassignResult.error);
        }
        
        // Always try to assign the new hotkey, regardless of unassign result
        overwolf.settings.hotkeys.assign({ name: hotkeyObject.name, modifiers: hotkeyObject.modifiers, virtualKey: hotkeyObject.virtualKeycode, gameId: 27168 }, (assignResult) => {
          if (assignResult.success) {
            logger.log('Hotkey assigned:', hotkeyObject.name);
            resolve();
          } else {
            logger.error('Failed to assign hotkey:', assignResult.error);
            reject(assignResult.error);
          }
        });
      });
    });
  }

  /**
   * Fetches all hotkeys using overwolf.settings.hotkeys.get()
   * and stores them internally
   */
  public fetchAllHotkeys(): Promise<Map<string, overwolf.settings.hotkeys.IHotkey>> {
    return new Promise((resolve, reject) => {
      overwolf.settings.hotkeys.get((result) => {
        if (!result.success) {
          reject(result.error);
          return;
        }
        const gameHotkeys = result.games?.[27168];
        logger.log('Game hotkeys:', gameHotkeys);
        const map = new Map<string, overwolf.settings.hotkeys.IHotkey>();
        gameHotkeys?.forEach(h => map.set(h.name, h));
  
        resolve(map);
      });
    });
  }
}