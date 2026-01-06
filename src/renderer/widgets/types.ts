/**
 * Widget type definitions
 */

// Re-export GameTimeStats from shared for convenience
export { GameTimeStats } from '../../shared/services/GameTimeService';

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

