/**
 * Library page type definitions
 */

export interface LibraryMapData {
  map_id: string;
  title?: string;
  thumbnail?: string;
  playCount: number;
  totalPlayTime: number; // in milliseconds
  lastPlayed: number; // timestamp
  firstPlayed: number; // timestamp
  isFavorite: boolean;
}

export type SortOption = 'total-time' | 'last-played' | 'a-z' | 'z-a' | 'session-count' | 'first-played';

export type FilterOption = 'all' | 'favorites';

export interface SortConfig {
  key: SortOption;
  label: string;
  icon: string;
}

export const SORT_OPTIONS: SortConfig[] = [
  { key: 'last-played', label: 'Last Played', icon: '🕐' },
  { key: 'total-time', label: 'Total Time', icon: '⏱️' },
  { key: 'session-count', label: 'Session Count', icon: '🔢' },
  { key: 'a-z', label: 'A → Z', icon: '🔤' },
  { key: 'z-a', label: 'Z → A', icon: '🔡' },
  { key: 'first-played', label: 'First Played', icon: '📅' },
];
