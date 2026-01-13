/**
 * Widgets page type definitions
 */

// Re-export shared types for convenience
export { GameTimeStats } from '../../../../shared/services/GameTimeService';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  size: WidgetSize;
  position?: { x: number; y: number };
}

export enum WidgetType {
  GAME_TIME = 'game-time',
  HOTKEYS = 'hotkeys',
}

export interface WidgetInfo {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  defaultSize: WidgetSize;
}

export const AVAILABLE_WIDGETS: WidgetInfo[] = [
  {
    type: WidgetType.GAME_TIME,
    title: 'Game Time',
    description: 'Track your time in raids and lobby',
    icon: '⏱️',
    defaultEnabled: true,
    defaultSize: 'medium',
  },
  {
    type: WidgetType.HOTKEYS,
    title: 'Hotkeys',
    description: 'Quick reference for your configured hotkeys',
    icon: '⌨️',
    defaultEnabled: true,
    defaultSize: 'small',
  },
];
