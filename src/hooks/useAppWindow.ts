import { useEffect, useRef } from 'react';
import { OWWindow, OWGames } from "@overwolf/overwolf-api-ts";
import { kWindowNames } from "../consts";
import { createLogger } from '../services/Logger';

const logger = createLogger('useAppWindow');

export function useAppWindow(windowName: string) {
  const currWindowRef = useRef<OWWindow | null>(null);
  const mainWindowRef = useRef<OWWindow | null>(null);
  const maximizedRef = useRef<boolean>(false);

  useEffect(() => {
    mainWindowRef.current = new OWWindow('background');
    currWindowRef.current = new OWWindow(windowName);

    const closeButton = document.getElementById('closeButton');
    const maximizeButton = document.getElementById('maximizeButton');
    const minimizeButton = document.getElementById('minimizeButton');
    const header = document.getElementById('header');

    if (!closeButton || !maximizeButton || !minimizeButton || !header || !currWindowRef.current) {
      return;
    }

    // Set drag behavior
    currWindowRef.current.dragMove(header);

    // Close button
    closeButton.addEventListener('click', async () => {
      // Check if this is TrackMe window
      const isTrackMe = 
        windowName === kWindowNames.trackerDesktop || 
        windowName === kWindowNames.trackerIngame;
      
      if (isTrackMe && currWindowRef.current) {
        // Check if a game is running
        try {
          const gameInfo = await OWGames.getRunningGameInfo();
          const isGameRunning = gameInfo && gameInfo.isRunning;
          
          if (isGameRunning) {
            // Hide (minimize) instead of closing when in-game
            await currWindowRef.current.minimize();
            return;
          }
        } catch (error) {
          logger.error('Error checking game state:', error);
        }
      }
      
      // Close normally when not in-game or not TrackMe
      if (mainWindowRef.current) {
        mainWindowRef.current.close();
      }
    });

    // Minimize button
    minimizeButton.addEventListener('click', () => {
      if (currWindowRef.current) {
        currWindowRef.current.minimize();
      }
    });

    // Maximize button
    maximizeButton.addEventListener('click', () => {
      if (currWindowRef.current) {
        if (!maximizedRef.current) {
          currWindowRef.current.maximize();
        } else {
          currWindowRef.current.restore();
        }
        maximizedRef.current = !maximizedRef.current;
      }
    });
  }, [windowName]);

  return {
    currWindow: currWindowRef.current,
    mainWindow: mainWindowRef.current,
    getWindowState: async () => {
      if (currWindowRef.current) {
        return await currWindowRef.current.getWindowState();
      }
      return null;
    }
  };
}

