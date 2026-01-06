import { useState, useEffect } from 'react';
import { createLogger } from '../services/Logger';

const logger = createLogger('useCheckedDetails');

const STORAGE_KEY = 'recycleme_checked_details';

/**
 * Hook to get checked details from localStorage
 */
export const useCheckedDetails = (): Record<string, boolean> => {
  const [checkedDetails, setCheckedDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadCheckedDetails = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const details = JSON.parse(stored) as Record<string, boolean>;
          setCheckedDetails(details);
        } else {
          setCheckedDetails({});
        }
      } catch (error) {
        logger.error('Error loading checked details:', error);
        setCheckedDetails({});
      }
    };

    // Load initial value
    loadCheckedDetails();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadCheckedDetails();
      }
    };

    // Listen for custom events (for same-window updates)
    const handleCustomStorageChange = () => {
      loadCheckedDetails();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    // Poll localStorage periodically as a fallback
    const pollInterval = setInterval(loadCheckedDetails, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  return checkedDetails;
};

