import { useEffect, useState } from "react";
import { kWindowNames } from "../../shared/consts";
import { createLogger } from "../../shared/services/Logger";

const logger = createLogger('useWindowInfo');

export const useWindowInfo = (): { windowName: string; isIngameWindow: boolean } => {
  const [windowName, setWindowName] = useState<string | null>(null);
  const [isIngameWindow, setIsIngameWindow] = useState<boolean>(false);

  useEffect(() => {
    const detectWindowName = async () => {
      return new Promise<string>((resolve) => {
        overwolf.windows.getCurrentWindow((result) => {
          if (result.success && result.window) {
            const windowName = result.window.name;
            // Check if it's desktop or in-game version
            if (windowName === kWindowNames.trackerDesktop || windowName === kWindowNames.trackerIngame) {
              resolve(windowName);
            } else {
              // Fallback to desktop if detection fails
              resolve(kWindowNames.trackerDesktop);
            }
          } else {
            // Fallback to desktop if detection fails
            resolve(kWindowNames.trackerDesktop);
          }
        });
      });
    };

    detectWindowName().then((windowName) => {
      logger.log('Detected tracker window', windowName);
      // Set whether this is the in-game window
      setWindowName(windowName);
      setIsIngameWindow(windowName === kWindowNames.trackerIngame);
    });
  }, []);

  return { windowName, isIngameWindow };
};