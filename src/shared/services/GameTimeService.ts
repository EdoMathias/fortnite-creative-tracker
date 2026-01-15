import { createLogger } from './Logger';

const logger = createLogger('GameTimeService');

const STORAGE_KEY = 'fortnite_tracker_game_time';

export interface GameTimeStats {
  /** Total time in-game (in maps) in seconds */
  inMapTime: number;
  /** Total time in lobby in seconds */
  lobbyTime: number;
  /** Total played time in seconds */
  totalTime: number;
  /** Number of map sessions played (total) */
  mapsPlayed: number;
  /** Number of maps played in current game session */
  sessionMapsPlayed: number;
  /** Current session time in seconds */
  currentTime: number;
  /** Current scene state */
  currentScene?: 'inMap' | 'lobby';
  /** Average time per map in seconds */
  avgMapTime: number;
  /** Average lobby/downtime in seconds */
  avgDowntime: number;
}

interface GameTimeData {
  /** Total seconds in-map */
  inMapTime: number;
  /** Total seconds in lobby */
  lobbyTime: number;
  /** Count of maps played (total) */
  mapsPlayed: number;
  /** Count of maps played in current game session */
  sessionMapsPlayed: number;
  /** Current active session */
  currentSession?: {
    state: 'inMap' | 'lobby';
    startTime: number; // timestamp
  };
}

/**
 * Service for tracking time spent in-game vs lobby
 */
export class GameTimeService {
  private static _instance: GameTimeService;
  private _gameTimeData: GameTimeData = {
    inMapTime: 0,
    lobbyTime: 0,
    mapsPlayed: 0,
    sessionMapsPlayed: 0
  };

  private constructor() {
    this.loadGameTimeData();
  }

  public static instance(): GameTimeService {
    if (!GameTimeService._instance) {
      GameTimeService._instance = new GameTimeService();
    }
    return GameTimeService._instance;
  }

  /**
   * Load game time data from localStorage
   */
  private loadGameTimeData(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle migration from old format (raidTime -> inMapTime)
        this._gameTimeData = {
          inMapTime: parsed.inMapTime ?? parsed.raidTime ?? 0,
          lobbyTime: parsed.lobbyTime ?? 0,
          mapsPlayed: parsed.mapsPlayed ?? parsed.raidsPlayed ?? 0,
          sessionMapsPlayed: parsed.sessionMapsPlayed ?? parsed.sessionRaidsPlayed ?? 0,
          currentSession: parsed.currentSession ? {
            state: parsed.currentSession.state === 'raid' ? 'inMap' : parsed.currentSession.state,
            startTime: parsed.currentSession.startTime
          } : undefined
        };
      }
    } catch (error) {
      logger.error('Error loading game time data:', error);
      this._gameTimeData = { inMapTime: 0, lobbyTime: 0, mapsPlayed: 0, sessionMapsPlayed: 0 };
    }
  }

  /**
   * Reload data from localStorage (useful when receiving updates from other windows)
   */
  public reloadData(): void {
    this.loadGameTimeData();
  }

  /**
   * Reset session maps played counter (called when game launches)
   */
  public resetSessionMaps(): void {
    this._gameTimeData.sessionMapsPlayed = 0;
    this.saveGameTimeData();
    logger.debug('Reset session maps played counter');
  }

  /**
   * Save game time data to localStorage
   */
  private saveGameTimeData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._gameTimeData));
      // Dispatch custom event for same-window updates
      window.dispatchEvent(new Event('gameTimeChanged'));
    } catch (error) {
      logger.error('Error saving game time data:', error);
    }
  }

  /**
   * Start tracking a game session state (inMap or lobby)
   */
  public startSession(state: 'inMap' | 'lobby'): void {
    const current = this._gameTimeData.currentSession;
  
    // If we're already in this state, do nothing (prevents double-count on duplicate signals)
    if (current && current.state === state) {
      logger.debug(`Ignoring startSession for same state "${state}"`);
      return;
    }
  
    // If there's an active session in a different state, end it first
    if (current) {
      this.endSession();
    }
  
    // Increment maps played counter when entering a map
    if (state === 'inMap') {
      this._gameTimeData.mapsPlayed = (this._gameTimeData.mapsPlayed || 0) + 1;
      this._gameTimeData.sessionMapsPlayed = (this._gameTimeData.sessionMapsPlayed || 0) + 1;
    }
  
    this._gameTimeData.currentSession = {
      state,
      startTime: Date.now()
    };
    this.saveGameTimeData();
    logger.debug(`Started ${state} session${state === 'inMap' ? ` (Map #${this._gameTimeData.mapsPlayed})` : ''}`);
  }

  /**
   * End the current game session and add time to appropriate counter
   */
  public endSession(): void {
    if (!this._gameTimeData.currentSession) {
      return;
    }

    const session = this._gameTimeData.currentSession;
    const durationSeconds = Math.floor((Date.now() - session.startTime) / 1000);

    if (session.state === 'inMap') {
      this._gameTimeData.inMapTime += durationSeconds;
    } else {
      this._gameTimeData.lobbyTime += durationSeconds;
    }

    this._gameTimeData.currentSession = undefined;
    this.saveGameTimeData();
    logger.debug(`Ended ${session.state} session, duration: ${durationSeconds}s`);
  }

  /**
   * Get current game time stats
   */
  public getGameTimeStats(): GameTimeStats {
    let totalInMapTime = this._gameTimeData.inMapTime;
    let totalLobbyTime = this._gameTimeData.lobbyTime;
    let currentScene: 'inMap' | 'lobby' | undefined = undefined;
    let currentTime = 0;

    // Include current session time if active
    if (this._gameTimeData.currentSession) {
      const durationSeconds = Math.floor((Date.now() - this._gameTimeData.currentSession.startTime) / 1000);
      currentScene = this._gameTimeData.currentSession.state;
      currentTime = durationSeconds;
      
      if (this._gameTimeData.currentSession.state === 'inMap') {
        totalInMapTime += durationSeconds;
      } else {
        totalLobbyTime += durationSeconds;
      }
    }

    const mapsPlayed = this._gameTimeData.mapsPlayed || 0;
    const avgMapTime = mapsPlayed > 0 ? Math.floor(this._gameTimeData.inMapTime / mapsPlayed) : 0;
    const avgDowntime = mapsPlayed > 0 ? Math.floor(this._gameTimeData.lobbyTime / mapsPlayed) : 0;

    return {
      inMapTime: totalInMapTime,
      lobbyTime: totalLobbyTime,
      totalTime: totalInMapTime + totalLobbyTime,
      mapsPlayed: mapsPlayed,
      sessionMapsPlayed: this._gameTimeData.sessionMapsPlayed || 0,
      currentTime: currentTime,
      currentScene: currentScene,
      avgMapTime: avgMapTime,
      avgDowntime: avgDowntime
    };
  }

  /**
   * Reset all game time data
   */
  public resetGameTime(): void {
    this.endSession(); // End any active session first
    this._gameTimeData = {
      inMapTime: 0,
      lobbyTime: 0,
      mapsPlayed: 0,
      sessionMapsPlayed: 0,
      currentSession: undefined
    };
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._gameTimeData));
      window.dispatchEvent(new Event('gameTimeChanged'));
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(this._gameTimeData),
        oldValue: null,
        storageArea: localStorage
      }));
    } catch (error) {
      logger.error('Error resetting game time data:', error);
    }
    logger.log('Reset all game time data');
  }

  /**
   * Called when game terminates - end any active session and stop counting time
   */
  public onGameTerminated(): void {
    logger.debug('Game terminated, ending active session and stopping time tracking');
    
    // End any active session first (this will add the time to the totals)
    if (this._gameTimeData.currentSession) {
      this.endSession();
    }
    
    // Ensure currentSession is cleared
    this._gameTimeData.currentSession = undefined;
    this.saveGameTimeData();
    
    logger.debug('Game time tracking stopped - currentSession cleared');
  }
}

export const gameTimeService = GameTimeService.instance();
