import { createLogger } from '../../../shared/services/Logger';
import { Item, KeepCategoryKey } from '../../../shared/types';
import { getTotalCountNeeded } from '../../../shared/utils';
import { ProgressStats, FastestUnlockable } from '../types';

const logger = createLogger('ProgressService');

const STORAGE_KEY_OWNED = 'recycleme_owned_items';
const STORAGE_KEY_CHECKED = 'recycleme_checked_details';

interface OwnedItems {
  [itemName: string]: number;
}

interface CheckedDetails {
  [key: string]: boolean; // key format: `${itemName}-${category}-${detailLabel}`
}

/**
 * Service for calculating progress on workshop/quests/projects
 */
export class ProgressService {
  private static _instance: ProgressService;

  private constructor() {}

  public static instance(): ProgressService {
    if (!ProgressService._instance) {
      ProgressService._instance = new ProgressService();
    }
    return ProgressService._instance;
  }

  /**
   * Load owned items from localStorage
   */
  private loadOwnedItems(): OwnedItems {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OWNED);
      if (stored) {
        return JSON.parse(stored) as OwnedItems;
      }
    } catch (error) {
      logger.error('Error loading owned items:', error);
    }
    return {};
  }

  /**
   * Load checked details from localStorage
   */
  private loadCheckedDetails(): CheckedDetails {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CHECKED);
      if (stored) {
        return JSON.parse(stored) as CheckedDetails;
      }
    } catch (error) {
      logger.error('Error loading checked details:', error);
    }
    return {};
  }

  /**
   * Find the fastest unlockable upgrade for a category
   */
  private findFastestUnlockable(
    items: Item[],
    category: KeepCategoryKey,
    ownedItems: OwnedItems,
    checkedDetails: CheckedDetails
  ): FastestUnlockable | undefined {
    // Collect all unlockables with their remaining count
    const unlockables: Array<{
      itemName: string;
      upgradeLabel: string;
      remaining: number;
    }> = [];

    for (const item of items) {
      const keepInfo = 
        category === 'workshop' ? item.keepForWorkshop :
        category === 'quests' ? item.keepForQuests :
        item.keepForProjects;

      if (!keepInfo.shouldKeep || keepInfo.details.length === 0) continue;

      const owned = ownedItems[item.name] || 0;
      let itemsAllocated = 0;

      // Go through details in order (they should be sorted by unlock order)
      for (const detail of keepInfo.details) {
        const key = `${item.name}-${category}-${detail.label}`;
        const isChecked = checkedDetails[key] || false;

        if (isChecked) {
          // This detail is completed, mark items as allocated
          itemsAllocated += detail.count;
        } else {
          // This is the first locked upgrade for this item
          // Calculate remaining items needed
          const itemsRequired = detail.count;
          
          // For unchecked details, show the full requirement as remaining
          // This matches the item view behavior where it shows the full requirement
          // The user expects to see "3 remaining" if the detail needs 3 items,
          // regardless of how many items they currently have available
          const remaining = itemsRequired;

          unlockables.push({
            itemName: item.name,
            upgradeLabel: detail.label,
            remaining: remaining
          });
          break; // Only consider the first locked upgrade per item
        }
      }
    }

    // Sort by remaining count (fastest = lowest remaining)
    unlockables.sort((a, b) => a.remaining - b.remaining);

    // Return the fastest one (lowest remaining count)
    return unlockables.length > 0 ? unlockables[0] : undefined;
  }

  /**
   * Get progress stats for all categories
   */
  public getProgressStats(allItems: Item[]): ProgressStats {
    const ownedItems = this.loadOwnedItems();
    const checkedDetails = this.loadCheckedDetails();

    // Filter items that need to be kept for each category
    const workshopItems = allItems.filter(item => item.keepForWorkshop.shouldKeep);
    const questsItems = allItems.filter(item => item.keepForQuests.shouldKeep);
    const projectsItems = allItems.filter(item => item.keepForProjects.shouldKeep);

    // Calculate workshop progress
    const workshopCompleted = workshopItems.filter(item => {
      const totalNeeded = getTotalCountNeeded(item);
      if (totalNeeded === 0) return false;
      const owned = ownedItems[item.name] || 0;
      return owned >= totalNeeded;
    }).length;

    // Calculate quests progress
    const questsCompleted = questsItems.filter(item => {
      const totalNeeded = getTotalCountNeeded(item);
      if (totalNeeded === 0) return false;
      const owned = ownedItems[item.name] || 0;
      return owned >= totalNeeded;
    }).length;

    // Calculate projects progress
    const projectsCompleted = projectsItems.filter(item => {
      const totalNeeded = getTotalCountNeeded(item);
      if (totalNeeded === 0) return false;
      const owned = ownedItems[item.name] || 0;
      return owned >= totalNeeded;
    }).length;

    // Find fastest unlockables
    const workshopFastest = this.findFastestUnlockable(workshopItems, 'workshop', ownedItems, checkedDetails);
    const questsFastest = this.findFastestUnlockable(questsItems, 'quests', ownedItems, checkedDetails);
    const projectsFastest = this.findFastestUnlockable(projectsItems, 'projects', ownedItems, checkedDetails);

    return {
      workshop: {
        completed: workshopCompleted,
        total: workshopItems.length,
        percentage: workshopItems.length > 0 
          ? Math.round((workshopCompleted / workshopItems.length) * 100) 
          : 0,
        fastestUnlockable: workshopFastest
      },
      quests: {
        completed: questsCompleted,
        total: questsItems.length,
        percentage: questsItems.length > 0 
          ? Math.round((questsCompleted / questsItems.length) * 100) 
          : 0,
        fastestUnlockable: questsFastest
      },
      projects: {
        completed: projectsCompleted,
        total: projectsItems.length,
        percentage: projectsItems.length > 0 
          ? Math.round((projectsCompleted / projectsItems.length) * 100) 
          : 0,
        fastestUnlockable: projectsFastest
      }
    };
  }
}

export const progressService = ProgressService.instance();

