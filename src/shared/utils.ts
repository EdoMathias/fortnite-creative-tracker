import { itemsDataService } from '../services/ItemsDataService';
import { EventRequirement, Item } from './types';

/**
 * Converts the items.json object to an array of items
 */
export const getItemsArray = (): Item[] => {
  return itemsDataService.getItemsArray();
};

/**
 * Gets the color for a rarity
 */
export const getRarityColor = (rarity: string): string => {
  switch (rarity.toLowerCase()) {
    case 'common':
      return '#9ca3af'; // gray
    case 'uncommon':
      return '#22c55e'; // green
    case 'rare':
      return '#3b82f6'; // blue
    case 'epic':
      return '#a855f7'; // purple
    case 'legendary':
      return '#f59e0b'; // orange/amber
    default:
      return '#9ca3af'; // default to gray
  }
};

/**
 * Get the total count needed for an item across all categories
 */
export const getActiveEventRequirements = (item: Item): EventRequirement[] => {
  return item.keepForEvents.filter((event) => event.active !== false);
};

export const shouldKeepForEvents = (item: Item): boolean => {
  return getActiveEventRequirements(item).length > 0;
};

const getEventRequirementCount = (event: EventRequirement): number => {
  if (typeof event.count === 'number' && event.count > 0) {
    return event.count;
  }

  return event.stages.reduce((sum, stage) => sum + stage.count, 0);
};

export const getTotalCountNeeded = (item: Item): number => {
  let total = 0;
  
  if (item.keepForWorkshop.shouldKeep) {
    total += item.keepForWorkshop.count;
  }
  if (item.keepForQuests.shouldKeep) {
    total += item.keepForQuests.count;
  }
  if (item.keepForProjects.shouldKeep) {
    total += item.keepForProjects.count;
  }

  const activeEvents = getActiveEventRequirements(item);
  if (activeEvents.length > 0) {
    total += activeEvents.reduce((sum, event) => sum + getEventRequirementCount(event), 0);
  }
  
  return total;
};

