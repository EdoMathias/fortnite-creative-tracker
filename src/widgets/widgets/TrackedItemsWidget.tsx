import React, { useState, useEffect, useMemo } from 'react';
import { itemsDataService } from '../../services/ItemsDataService';
import { getRarityColor, getTotalCountNeeded } from '../../shared/utils';

interface TrackedItem {
  itemName: string;
  trackedAmount: number;
}

export const TrackedItemsWidget: React.FC = () => {
  const [trackedItems, setTrackedItems] = useState<Record<string, number>>({});
  const [ownedItems, setOwnedItems] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadTrackedItems = () => {
      try {
        const stored = localStorage.getItem('recycleme_tracked_items');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Backward compatibility: if it's an array of strings, convert to Record
          if (Array.isArray(parsed)) {
            const record: Record<string, number> = {};
            parsed.forEach((itemName: string) => {
              record[itemName] = 1; // Default to 1 for existing tracked items
            });
            setTrackedItems(record);
          } else {
            setTrackedItems(parsed as Record<string, number>);
          }
        } else {
          setTrackedItems({});
        }
      } catch (error) {
        console.error('Error loading tracked items:', error);
        setTrackedItems({});
      }
    };

    const loadOwnedItems = () => {
      try {
        const stored = localStorage.getItem('recycleme_owned_items');
        if (stored) {
          setOwnedItems(JSON.parse(stored) as Record<string, number>);
        } else {
          setOwnedItems({});
        }
      } catch (error) {
        console.error('Error loading owned items:', error);
        setOwnedItems({});
      }
    };

    // Load initial data
    loadTrackedItems();
    loadOwnedItems();

    // Listen for changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recycleme_tracked_items') {
        loadTrackedItems();
      } else if (e.key === 'recycleme_owned_items') {
        loadOwnedItems();
      }
    };

    const handleCustomStorageChange = () => {
      loadTrackedItems();
      loadOwnedItems();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    // Poll as fallback
    const interval = setInterval(() => {
      loadTrackedItems();
      loadOwnedItems();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      clearInterval(interval);
    };
  }, []);

  const allItems = itemsDataService.getItemsArray();
  const itemsMap = useMemo(() => {
    return new Map(allItems.map(item => [item.name, item]));
  }, [allItems]);

  // Convert tracked items to array and sort by item name
  const trackedItemsList: TrackedItem[] = useMemo(() => {
    return Object.entries(trackedItems)
      .map(([itemName, trackedAmount]) => ({
        itemName,
        trackedAmount
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [trackedItems]);

  if (trackedItemsList.length === 0) {
    return (
      <div className="widget tracked-items-widget">
        <div className="widget-header">
          <h3>Tracked Items</h3>
        </div>
        <div className="widget-content">
          <div className="widget-empty-state">
            No items are currently being tracked.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget tracked-items-widget">
      <div className="widget-header">
        <h3>Tracked Items ({trackedItemsList.length})</h3>
      </div>
      <div className="widget-content">
        <div className="tracked-items-list">
          {trackedItemsList.map((item) => {
            const itemData = itemsMap.get(item.itemName);
            const rarityColor = itemData ? getRarityColor(itemData.rarity) : '#ffffff';
            const ownedCount = ownedItems[item.itemName] || 0;
            const trackedAmount = item.trackedAmount;
            // If no custom tracked amount is set (0), fall back to the item's default needed count
            const totalNeeded = itemData ? getTotalCountNeeded(itemData) : 0;
            const targetAmount = trackedAmount > 0 ? trackedAmount : totalNeeded;

            return (
              <div key={item.itemName} className="tracked-item">
                <div className="tracked-item-name" style={{ color: rarityColor }}>
                  {item.itemName}
                </div>
                <div className="tracked-item-amount">
                  {ownedCount} / {targetAmount}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

