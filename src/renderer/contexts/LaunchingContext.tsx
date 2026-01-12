import React, { createContext, useContext, useState, useCallback } from 'react';
import { kFortniteDeepLink } from '../../shared/consts';

interface LaunchingContextType {
  isLaunching: boolean;
  currentMapId: string | null;
  launchMap: (mapId: string) => void;
  closeLaunching: () => void;
}

const LaunchingContext = createContext<LaunchingContextType | undefined>(
  undefined
);

const LAUNCH_DISPLAY_DURATION = 10000; // 10 seconds

export const LaunchingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);

  const closeLaunching = useCallback(() => {
    setIsLaunching(false);
    setCurrentMapId(null);
  }, []);

  const launchMap = useCallback((mapId: string) => {
    setCurrentMapId(mapId);
    setIsLaunching(true);

    // Open the map using the Fortnite deep link
    const url = `${kFortniteDeepLink}${mapId}`;
    // window.open(url, '_blank');

    // Hide the overlay after a delay
    setTimeout(() => {
      setIsLaunching(false);
      setCurrentMapId(null);
    }, LAUNCH_DISPLAY_DURATION);
  }, []);

  return (
    <LaunchingContext.Provider
      value={{ isLaunching, currentMapId, launchMap, closeLaunching }}
    >
      {children}
    </LaunchingContext.Provider>
  );
};

export const useLaunching = (): LaunchingContextType => {
  const context = useContext(LaunchingContext);
  if (!context) {
    throw new Error('useLaunching must be used within a LaunchingProvider');
  }
  return context;
};
