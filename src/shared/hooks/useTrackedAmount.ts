import { useState, useEffect } from 'react';
import { createLogger } from '../../services/Logger';

const logger = createLogger('useTrackedAmount');

const TRACKED_KEY = 'recycleme_tracked_items';
const PENDING_KEY = 'recycleme_pending_amounts';

/**
 * Hook to get the effective target amount for a specific item
 * Prioritizes:
 * 1. Tracked amount (if > 0)
 * 2. Pending custom amount (if > 0)
 * 3. Returns 0 otherwise (meaning use default total needed)
 */
export const useTrackedAmount = (itemName: string): number => {
  const [effectiveAmount, setEffectiveAmount] = useState<number>(0);

  useEffect(() => {
    const loadAmounts = () => {
      try {
        let tracked = 0;
        let pending = 0;

        // Load tracked amount
        const storedTracked = localStorage.getItem(TRACKED_KEY);
        if (storedTracked) {
          const items = JSON.parse(storedTracked);
          if (!Array.isArray(items)) {
            tracked = items[itemName] || 0;
          }
        }

        // Load pending amount
        const storedPending = localStorage.getItem(PENDING_KEY);
        if (storedPending) {
          const items = JSON.parse(storedPending);
          pending = items[itemName] || 0;
        }

        // Determine effective amount
        if (tracked > 0) {
          setEffectiveAmount(tracked);
        } else if (pending > 0) {
          setEffectiveAmount(pending);
        } else {
          setEffectiveAmount(0);
        }

      } catch (error) {
        logger.error('Error loading amounts:', error);
        setEffectiveAmount(0);
      }
    };

    // Load initial value
    loadAmounts();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TRACKED_KEY || e.key === PENDING_KEY) {
        loadAmounts();
      }
    };

    // Listen for custom events (for same-window updates)
    const handleCustomStorageChange = () => {
      loadAmounts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    // Poll localStorage periodically as a fallback
    const pollInterval = setInterval(loadAmounts, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      clearInterval(pollInterval);
    };
  }, [itemName]);

  return effectiveAmount;
};
