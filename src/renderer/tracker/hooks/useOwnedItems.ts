import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '../../../shared/services/Logger';

const logger = createLogger('useOwnedItems');

const STORAGE_KEY = 'recycleme_owned_items';

interface OwnedItems {
  [itemName: string]: number;
}

export const useOwnedItems = () => {
  const [ownedItems, setOwnedItems] = useState<OwnedItems>({});
  const isInternalUpdateRef = useRef(false);

  // Load from localStorage on mount and listen for changes
  useEffect(() => {
    const loadOwnedItems = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const items = JSON.parse(stored) as OwnedItems;
          // Only update if different to avoid unnecessary re-renders
          setOwnedItems(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(items);
            if (prevStr !== newStr) {
              isInternalUpdateRef.current = false; // Mark as external update
              return items;
            }
            return prev;
          });
        } else {
          setOwnedItems(prev => {
            if (Object.keys(prev).length > 0) {
              isInternalUpdateRef.current = false; // Mark as external update
              return {};
            }
            return prev;
          });
        }
      } catch (error) {
        logger.error('Error loading owned items:', error);
      }
    };

    // Load initial value
    loadOwnedItems();

    // Listen for storage changes (when TrackMe updates values from other windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadOwnedItems();
      }
    };

    // Listen for custom events (for same-window updates)
    const handleCustomStorageChange = () => {
      loadOwnedItems();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    // Poll localStorage periodically as a fallback (every 500ms)
    const pollInterval = setInterval(loadOwnedItems, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Save to localStorage whenever ownedItems changes (but only if it's an internal update)
  useEffect(() => {
    // Only save if this was an internal update (not from loading from localStorage)
    if (isInternalUpdateRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ownedItems));
        // Dispatch custom event so other windows can react to changes
        window.dispatchEvent(new Event('localStorageChange'));
      } catch (error) {
        logger.error('Error saving owned items:', error);
      }
      isInternalUpdateRef.current = false; // Reset flag
    }
  }, [ownedItems]);

  const getOwnedCount = useCallback((itemName: string): number => {
    return ownedItems[itemName] || 0;
  }, [ownedItems]);

  const incrementOwned = useCallback((itemName: string, maxValue?: number) => {
    setOwnedItems(prev => {
      const current = prev[itemName] || 0;
      const newValue = current + 1;
      
      // If maxValue is provided, don't exceed it
      if (maxValue !== undefined && newValue > maxValue) {
        return prev;
      }
      
      isInternalUpdateRef.current = true; // Mark as internal update
      return {
        ...prev,
        [itemName]: newValue
      };
    });
  }, []);

  const decrementOwned = useCallback((itemName: string) => {
    setOwnedItems(prev => {
      const current = prev[itemName] || 0;
      if (current <= 0) return prev;
      
      isInternalUpdateRef.current = true; // Mark as internal update
      return {
        ...prev,
        [itemName]: current - 1
      };
    });
  }, []);

  const setOwnedCount = useCallback((itemName: string, count: number) => {
    isInternalUpdateRef.current = true; // Mark as internal update
    setOwnedItems(prev => ({
      ...prev,
      [itemName]: Math.max(0, count)
    }));
  }, []);

  const resetOwned = useCallback((itemName: string) => {
    isInternalUpdateRef.current = true; // Mark as internal update
    setOwnedItems(prev => {
      const newItems = { ...prev };
      delete newItems[itemName];
      return newItems;
    });
  }, []);

  return {
    getOwnedCount,
    incrementOwned,
    decrementOwned,
    setOwnedCount,
    resetOwned
  };
};

