import { kWindowNames } from '../../shared/consts';
import { createLogger } from '../../shared/services/Logger';

const logger = createLogger('MessageChannel');

/**
 * Message types that can be sent between windows
 */
export enum MessageType {
  MAP_UPDATED = 'map-updated',
  GAME_STATE_CHANGED = 'game-state-changed',
  TRACKER_WINDOW_SWITCHED = 'tracker-window-switched',
  CHECK_FTUE_STATUS = 'check-ftue-status',
  FTUE_STATUS_RESPONSE = 'ftue-status-response',
  HOTKEY_UPDATED = 'hotkey-updated',
  GAME_TIME_UPDATED = 'game-time-updated',
  CUSTOM = 'custom',
  TOP_MAPS_REQUEST = "top-maps-request",
  TOP_MAPS_UPDATED = "top-maps-updated",
  /** Request dashboard data for a time range */
  DASHBOARD_REQUEST = "dashboard-request",
  /** Dashboard data response */
  DASHBOARD_UPDATED = "dashboard-updated",
  /** Request library data (all maps) */
  LIBRARY_REQUEST = "library-request",
  /** Library data response */
  LIBRARY_UPDATED = "library-updated",
  /** Request overview stats */
  OVERVIEW_REQUEST = "overview-request",
  /** Overview stats response */
  OVERVIEW_UPDATED = "overview-updated",
}

/**
 * Message payload structure
 */
export interface MessagePayload {
  type: MessageType;
  data?: any;
  timestamp?: number;
}

/**
 * MessageChannel handles inter-window communication using overwolf.windows.sendMessage()
 */
export class MessageChannel {
  private _messageHandlers: Map<MessageType, Array<(payload: MessagePayload) => void>> = new Map();
  private _isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initializes the message channel by setting up the message listener
   */
  private initialize(): void {
    if (this._isInitialized) {
      return;
    }

    overwolf.windows.onMessageReceived.addListener((message: overwolf.windows.MessageReceivedEvent) => {
      this.handleMessage(message);
    });

    this._isInitialized = true;
  }

  /**
   * Handles incoming messages
   */
  private handleMessage(message: overwolf.windows.MessageReceivedEvent): void {
    if (!message || !message.content) {
      logger.warn('Received invalid message:', message);
      return;
    }

    try {
      // Overwolf API sends: { content: payload, ... }
      // The payload we sent has { type, data, timestamp }
      const payload: MessagePayload = typeof message.content === 'string'
        ? JSON.parse(message.content)
        : message.content;

      // Also check if type is directly on message (some Overwolf API versions)
      const messageType = payload.type || (message as any).type;

      if (!messageType) {
        logger.warn('Received message without type:', { payload, message });
        return;
      }

      const handlers = this._messageHandlers.get(messageType as MessageType);
      if (handlers && handlers.length > 0) {
        handlers.forEach(handler => {
          try {
            handler(payload);
          } catch (error) {
            logger.error(`Error in message handler for ${messageType}:`, error);
          }
        });
      } else {
        logger.debug(`No handlers registered for message type: ${messageType}`, {
          availableTypes: Array.from(this._messageHandlers.keys()),
          receivedPayload: payload
        });
      }
    } catch (error) {
      logger.error('Error parsing message:', error, message);
    }
  }

  /**
   * Sends a message to a specific window
   * @param targetWindow - The name of the target window
   * @param type - The message type
   * @param data - Optional data to send
   * @returns Promise that resolves when message is sent
   */
  public async sendMessage(
    targetWindow: string,
    type: MessageType,
    data?: any
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const payload: MessagePayload = {
        type,
        data,
        timestamp: Date.now()
      };

      overwolf.windows.sendMessage(targetWindow, type, payload, (result) => {
        if (result.success) {
          logger.debug(`Message sent to ${targetWindow}:`, type, data);
          resolve(true);
        } else {
          logger.error(`Failed to send message to ${targetWindow}:`, result.error);
          resolve(false);
        }
      });
    });
  }

  /**
   * Broadcasts a message to multiple windows
   * @param targetWindows - Array of window names to send to
   * @param type - The message type
   * @param data - Optional data to send
   * @returns Promise that resolves when all messages are sent
   */
  public async broadcastMessage(
    targetWindows: string[],
    type: MessageType,
    data?: any
  ): Promise<boolean[]> {
    const promises = targetWindows.map(window => this.sendMessage(window, type, data));
    return Promise.all(promises);
  }

  /**
   * Registers a message handler for a specific message type
   * @param type - The message type to listen for
   * @param handler - The handler function
   * @returns A function to unregister the handler
   */
  public onMessage(
    type: MessageType,
    handler: (payload: MessagePayload) => void
  ): () => void {
    if (!this._messageHandlers.has(type)) {
      this._messageHandlers.set(type, []);
    }

    const handlers = this._messageHandlers.get(type)!;
    handlers.push(handler);

    // Return unregister function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Removes all handlers for a message type
   * @param type - The message type to clear handlers for
   */
  public clearHandlers(type: MessageType): void {
    this._messageHandlers.delete(type);
  }

  /**
   * Removes all message handlers
   */
  public clearAllHandlers(): void {
    this._messageHandlers.clear();
  }
}

