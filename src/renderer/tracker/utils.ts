import { Item, KeepCategoryKey, KeepDetail } from "../../shared/types";
import { getActiveEventRequirements, getItemsArray, getTotalCountNeeded } from "../../shared/utils";

// Re-export getTotalCountNeeded for backward compatibility with tracker components
export { getTotalCountNeeded };

export interface KeepReason {
  category: string;
  categoryKey: KeepCategoryKey;
  count: number;
  details: KeepDetail[];
  meta?: {
    eventId?: string;
    eventName?: string;
    active?: boolean;
  };
}

/**
 * Get all items that should be tracked (have keepForWorkshop, keepForQuests, or keepForProjects)
 */
export const getTrackableItems = (): Item[] => {
  const itemsArray = getItemsArray();
  
  return itemsArray.filter(item => 
    item.keepForWorkshop.shouldKeep ||
    item.keepForQuests.shouldKeep ||
    item.keepForProjects.shouldKeep ||
    getActiveEventRequirements(item).length > 0
  );
};

/**
 * Get all reasons why an item should be kept
 */
export const getKeepReasons = (item: Item): KeepReason[] => {
  const reasons: KeepReason[] = [];
  
  if (item.keepForWorkshop.shouldKeep) {
    reasons.push({
      category: 'Workshop',
      categoryKey: 'workshop',
      count: item.keepForWorkshop.count,
      details: item.keepForWorkshop.details
    });
  }
  
  if (item.keepForQuests.shouldKeep) {
    reasons.push({
      category: 'Quests',
      categoryKey: 'quests',
      count: item.keepForQuests.count,
      details: item.keepForQuests.details
    });
  }
  
  if (item.keepForProjects.shouldKeep) {
    reasons.push({
      category: 'Projects',
      categoryKey: 'projects',
      count: item.keepForProjects.count,
      details: item.keepForProjects.details
    });
  }

  const activeEvents = getActiveEventRequirements(item);
  activeEvents.forEach((event) => {
    const detailLabelPrefix = `Event · ${event.eventName}`;
    const details =
      event.stages.length > 0
        ? event.stages.map((stage) => ({
            label: `Stage: ${stage.label}`,
            count: stage.count,
          }))
        : [
            {
              label: detailLabelPrefix,
              count: event.count,
            },
          ];

    reasons.push({
      category: detailLabelPrefix,
      categoryKey: 'events',
      count: event.count,
      details,
      meta: {
        eventId: event.eventId,
        eventName: event.eventName,
        active: event.active !== false,
      },
    });
  });
  
  return reasons;
};


