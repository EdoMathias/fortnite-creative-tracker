/**
 * Widget type definitions
 */

// Re-export GameTimeStats from shared for convenience
export { GameTimeStats } from '../../shared/services/GameTimeService';

export type ViewMode = 'overview' | 'top-maps' | 'dashboards' | 'library' | 'widgets';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export enum WidgetType {
  GAME_TIME = 'game-time',
  HOTKEYS = 'hotkeys'
}

