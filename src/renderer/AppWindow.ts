import { OWWindow, OWGames } from "@overwolf/overwolf-api-ts";
import { kWindowNames } from "../shared/consts";
import { createLogger } from '../shared/services/Logger';

const logger = createLogger('AppWindow');

// A base class for the app's foreground windows.
// Sets the modal and drag behaviors, which are shared accross the desktop and in-game windows.
export class AppWindow {
  protected currWindow: OWWindow;
  protected mainWindow: OWWindow;
  protected maximized: boolean = false;

  constructor(windowName) {
    this.mainWindow = new OWWindow('background');
    this.currWindow = new OWWindow(windowName);

    const closeButton = document.getElementById('closeButton');
    const maximizeButton = document.getElementById('maximizeButton');
    const minimizeButton = document.getElementById('minimizeButton');
    const header = document.getElementById('header');

    // Only set up controls if they exist (some windows may not have them)
    if (header) {
      this.setDrag(header);
    }

    if (closeButton) {
      closeButton.addEventListener('click', async () => {
        // Check if this is TrackMe window
        const isTrackMe = 
          windowName === kWindowNames.trackerDesktop || 
          windowName === kWindowNames.trackerIngame;
        
        if (isTrackMe) {
          // Check if a game is running
          try {
            const gameInfo = await OWGames.getRunningGameInfo();
            const isGameRunning = gameInfo && gameInfo.isRunning;
            
            if (isGameRunning) {
              // Hide (minimize) instead of closing when in-game
              await this.currWindow.minimize();
              return;
            }
          } catch (error) {
            logger.error('Error checking game state:', error);
          }
        }
        
        // Close normally when not in-game or not TrackMe
        this.mainWindow.close();
      });
    }

    if (minimizeButton) {
      minimizeButton.addEventListener('click', () => {
        this.currWindow.minimize();
      });
    }

    if (maximizeButton) {
      maximizeButton.addEventListener('click', () => {
        if (!this.maximized) {
          this.currWindow.maximize();
        } else {
          this.currWindow.restore();
        }

        this.maximized = !this.maximized;
      });
    }
  }

  public async getWindowState() {
    return await this.currWindow.getWindowState();
  }

  public getCurrWindow() {
    return this.currWindow;
  }

  private async setDrag(elem) {
    this.currWindow.dragMove(elem);
  }
}

