import { useState, useEffect } from 'react';
import { createLogger } from '../services/Logger';

const logger = createLogger('useOwnedCount');

const STORAGE_KEY = 'recycleme_owned_items';

/**
 * Hook to get the owned count for a specific item
 */
export const useOwnedCount = (itemName: string): number => {
  const [ownedCount, setOwnedCount] = useState<number>(0);

  useEffect(() => {
    const loadOwnedCount = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const items = JSON.parse(stored) as Record<string, number>;
          setOwnedCount(items[itemName] || 0);
        } else {
          setOwnedCount(0);
        }
      } catch (error) {
        logger.error('Error loading owned count:', error);
        setOwnedCount(0);
      }
    };

    // Load initial value
    loadOwnedCount();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadOwnedCount();
      }
    };

    // Listen for custom events (for same-window updates)
    const handleCustomStorageChange = () => {
      loadOwnedCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    // Poll localStorage periodically as a fallback
    const pollInterval = setInterval(loadOwnedCount, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      clearInterval(pollInterval);
    };
  }, [itemName]);

  return ownedCount;
};

