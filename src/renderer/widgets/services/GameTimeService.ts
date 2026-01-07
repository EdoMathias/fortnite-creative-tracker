import { createLogger } from '../../../shared/services/Logger';
import { GameTimeStats } from '../types';

const logger = createLogger('GameTimeService');

const STORAGE_KEY = 'fortnite_tracker_game_time';

interface GameTimeData {
  raidTime: number; // total seconds in raid
  lobbyTime: number; // total seconds in lobby
  raidsPlayed: number; // count of raids played (total)
  sessionRaidsPlayed: number; // count of raids played in current game session
  currentSession?: {
    state: 'raid' | 'lobby';
    startTime: number; // timestamp
  };
}

/**
 * Service for tracking time spent in raid vs lobby
 */
export class GameTimeService {
  private static _instance: GameTimeService;
  private _gameTimeData: GameTimeData = {
    raidTime: 0,
    lobbyTime: 0,
    raidsPlayed: 0,
    sessionRaidsPlayed: 0
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
   * Restore currentSession if it exists and is recent (game is running)
   * Sessions older than 5 minutes are considered stale and cleared
   */
  private loadGameTimeData(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GameTimeData;
        // Ensure raidsPlayed exists for backward compatibility
        this._gameTimeData = {
          raidTime: parsed.raidTime || 0,
          lobbyTime: parsed.lobbyTime || 0,
          raidsPlayed: parsed.raidsPlayed || 0,
          sessionRaidsPlayed: parsed.sessionRaidsPlayed || 0,
          // Restore current session even if it is older than 5 minutes.
          // We rely on explicit game termination hooks to clear stale data.
          currentSession: parsed.currentSession
        };
      }
    } catch (error) {
      logger.error('Error loading game time data:', error);
      this._gameTimeData = { raidTime: 0, lobbyTime: 0, raidsPlayed: 0, sessionRaidsPlayed: 0 };
    }
  }

  /**
   * Reload data from localStorage (useful when receiving updates from other windows)
   */
  public reloadData(): void {
    this.loadGameTimeData();
  }

  /**
   * Reset session raids played counter (called when game launches)
   */
  public resetSessionRaids(): void {
    this._gameTimeData.sessionRaidsPlayed = 0;
    this.saveGameTimeData();
    logger.debug('Reset session raids played counter');
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
   * Start tracking a game session state (raid or lobby)
   */
  public startSession(state: 'raid' | 'lobby'): void {
    const current = this._gameTimeData.currentSession;
  
    // If we’re already in this state, do nothing (prevents double-count on duplicate signals)
    if (current && current.state === state) {
      logger.debug(`Ignoring startSession for same state "${state}"`);
      return;
    }
  
    // If there's an active session in a different state, end it first
    if (current) {
      this.endSession();
    }
  
    // Increment raids played counter when starting a raid
    if (state === 'raid') {
      this._gameTimeData.raidsPlayed = (this._gameTimeData.raidsPlayed || 0) + 1;
      this._gameTimeData.sessionRaidsPlayed = (this._gameTimeData.sessionRaidsPlayed || 0) + 1;
    }
  
    this._gameTimeData.currentSession = {
      state,
      startTime: Date.now()
    };
    this.saveGameTimeData();
    logger.debug(`Started ${state} session${state === 'raid' ? ` (Raid #${this._gameTimeData.raidsPlayed})` : ''}`);
  }

  /**
   * End the current game session and add time to appropriate counter
   */
  public endSession(): void {
    if (!this._gameTimeData.currentSession) {
      return;
    }

    const session = this._gameTimeData.currentSession;
    const duration = Math.floor((Date.now() - session.startTime) / 1000); // in seconds

    if (session.state === 'raid') {
      this._gameTimeData.raidTime += duration;
    } else {
      this._gameTimeData.lobbyTime += duration;
    }

    this._gameTimeData.currentSession = undefined;
    this.saveGameTimeData();
    logger.debug(`Ended ${session.state} session, duration: ${duration}s`);
  }

  /**
   * Get current game time stats
   * Only includes active session time if there's a current session (game is running)
   */
  public getGameTimeStats(): GameTimeStats {
    // If there's an active session, include its current duration
    let currentRaidTime = this._gameTimeData.raidTime;
    let currentLobbyTime = this._gameTimeData.lobbyTime;
    
    // Current session times (reset on scene change)
    let currentSessionRaidTime = 0;
    let currentSessionLobbyTime = 0;
    let currentScene: 'raid' | 'lobby' | undefined = undefined;
    let currentTime = 0;

    // Only count time if there's an active session (game is running)
    if (this._gameTimeData.currentSession) {
      const duration = Math.floor((Date.now() - this._gameTimeData.currentSession.startTime) / 1000);
      currentScene = this._gameTimeData.currentSession.state;
      currentTime = duration;
      
      if (this._gameTimeData.currentSession.state === 'raid') {
        currentRaidTime += duration;
        currentSessionRaidTime = duration; // Current raid session time
      } else {
        currentLobbyTime += duration;
        currentSessionLobbyTime = duration; // Current lobby session time
      }
    }

    // Calculate averages based on base totals (excluding current session)
    // avgRaidTime = totalRaidTime / raidsPlayed
    // avgDowntime = totalLobbyTime / raidsPlayed
    const raidsPlayed = this._gameTimeData.raidsPlayed || 0;
    const totalRaidTimeMs = this._gameTimeData.raidTime; // stored in seconds
    const totalLobbyTimeMs = this._gameTimeData.lobbyTime; // stored in seconds
    const avgRaidTime = raidsPlayed > 0 ? Math.floor(totalRaidTimeMs / raidsPlayed) : 0;
    const avgDowntime = raidsPlayed > 0 ? Math.floor(totalLobbyTimeMs / raidsPlayed) : 0;

    return {
      raidTime: currentRaidTime,
      lobbyTime: currentLobbyTime,
      totalTime: currentRaidTime + currentLobbyTime,
      raidsPlayed: raidsPlayed,
      sessionRaidsPlayed: this._gameTimeData.sessionRaidsPlayed || 0,
      currentRaidTime: currentSessionRaidTime,
      currentLobbyTime: currentSessionLobbyTime,
      currentScene: currentScene,
      currentTime: currentTime,
      avgRaidTime: avgRaidTime,
      avgDowntime: avgDowntime
    };
  }

  /**
   * Reset all game time data
   */
  public resetGameTime(): void {
    this.endSession(); // End any active session first
    this._gameTimeData = {
      raidTime: 0,
      lobbyTime: 0,
      raidsPlayed: 0,
      sessionRaidsPlayed: 0,
      currentSession: undefined // Explicitly clear current session
    };
    // Remove from localStorage to ensure it's completely cleared
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Also save empty data to ensure it's cleared
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._gameTimeData));
      // Dispatch events to notify all windows
      window.dispatchEvent(new Event('gameTimeChanged'));
      // Trigger storage event for cross-window updates
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
    
    // Always clear currentSession to ensure time stops counting
    // This is critical - even if there was no session, we need to ensure it's cleared
    this._gameTimeData.currentSession = undefined;
    this.saveGameTimeData();
    
    logger.debug('Game time tracking stopped - currentSession cleared');
  }
}

export const gameTimeService = GameTimeService.instance();

