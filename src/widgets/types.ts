/**
 * Widget type definitions
 */

export type ViewMode = 'items' | 'widgets';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export enum WidgetType {
  GAME_TIME = 'game-time',
  PROGRESS = 'progress'
}

export interface GameTimeStats {
  raidTime: number; // in seconds (total accumulated)
  lobbyTime: number; // in seconds (total accumulated)
  totalTime: number; // in seconds
  raidsPlayed: number; // count of raids played (total)
  sessionRaidsPlayed: number; // count of raids played in current game session
  currentRaidTime: number; // in seconds (current session, resets on scene change)
  currentLobbyTime: number; // in seconds (current session, resets on scene change)
  currentScene?: 'raid' | 'lobby'; // current scene state
  currentTime: number; // current session time in seconds
  avgRaidTime: number; // average raid time in seconds
  avgDowntime: number; // average lobby/downtime in seconds
}

export interface FastestUnlockable {
  itemName: string;
  upgradeLabel: string;
  remaining: number;
}

export interface ProgressStats {
  workshop: {
    completed: number;
    total: number;
    percentage: number;
    fastestUnlockable?: FastestUnlockable;
  };
  quests: {
    completed: number;
    total: number;
    percentage: number;
    fastestUnlockable?: FastestUnlockable;
  };
  projects: {
    completed: number;
    total: number;
    percentage: number;
    fastestUnlockable?: FastestUnlockable;
  };
}

