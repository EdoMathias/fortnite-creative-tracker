/**
 * @fileoverview Top Maps Store - Manages persistent storage for map play sessions.
 * 
 * Uses IndexedDB for scalable storage that can handle large datasets.
 * Automatically migrates data from localStorage on first use.
 * Data is automatically cleaned up after 90 days.
 * 
 * Architecture:
 * - Store state is cached in memory for synchronous reads
 * - Writes are async but fire-and-forget for performance
 * - Initialization must complete before use (call init() on app startup)
 */

import { startOfDay, dayKey, MS_PER_DAY, MS_PER_HOUR } from "../../../shared/utils/dateUtils";
import { IndexedDBStorage } from "../../../shared/utils/indexedDBStorage";

// ============================================================================
// Constants
// ============================================================================

/** IndexedDB database name */
const DB_NAME = "fit-top-maps";

/** IndexedDB store name */
const STORE_NAME = "store";

/** Key used for the main store data */
const STORE_KEY = "data";

/** Maximum session duration before auto-recovery (8 hours) */
const MAX_SESSION_MS = 8 * MS_PER_HOUR;

/** Number of days to retain data before cleanup */
const RETENTION_DAYS = 90;

/** Minimum interval between cleanup runs (1 hour) */
const CLEANUP_INTERVAL_MS = MS_PER_HOUR;

// ============================================================================
// Types
// ============================================================================

/** Represents a currently active (in-progress) map session */
export type ActiveSession = {
    map_id: string;
    startedAt: number;
};

/** Represents a completed map session with start and end times */
export type MapSession = {
    map_id: string;
    startedAt: number;
    endedAt: number;
};

/** 
 * Daily totals organized by date and map ID.
 * Structure: { "YYYY-MM-DD": { "map_id": milliseconds } }
 */
export type DailyTotals = Record<string, Record<string, number>>;

/** Version 1 of the store schema */
export type StoreV1 = {
    version: 1;
    activeSession: ActiveSession | null;
    sessions: MapSession[];
    dailyTotals: DailyTotals;
    lastCleanupAt?: number;
};

// ============================================================================
// Internal State
// ============================================================================

/** IndexedDB storage instance */
const storage = new IndexedDBStorage<StoreV1>(DB_NAME, STORE_NAME);

/** In-memory cache of the store state */
let cachedStore: StoreV1 | null = null;

/** Whether initialization has completed */
let isInitialized = false;

/** Pending save promise to prevent write conflicts */
let pendingSave: Promise<void> | null = null;

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Get the current timestamp in milliseconds.
 * @returns Current Unix timestamp in ms
 */
function nowMs(): number {
    return Date.now();
}

/**
 * Create an empty store with default values.
 * @returns A new empty store
 */
function createEmptyStore(): StoreV1 {
    return {
        version: 1,
        activeSession: null,
        sessions: [],
        dailyTotals: {},
    };
}

/**
 * Load the store from IndexedDB.
 * @returns The loaded store or null if none exists
 */
async function loadFromDB(): Promise<StoreV1 | null> {
    try {
        const data = await storage.get(STORE_KEY);
        if (data && data.version === 1) {
            return {
                version: 1,
                activeSession: data.activeSession ?? null,
                sessions: data.sessions ?? [],
                dailyTotals: data.dailyTotals ?? {},
                lastCleanupAt: data.lastCleanupAt,
            };
        }
        return null;
    } catch (error) {
        console.error('[TopMapsStore] Failed to load from IndexedDB:', error);
        return null;
    }
}

/**
 * Save the store to IndexedDB asynchronously.
 * Uses a queue to prevent concurrent writes.
 */
function saveAsync(): void {
    if (!cachedStore) return;

    const storeToSave = { ...cachedStore };

    const doSave = async () => {
        try {
            await storage.set(STORE_KEY, storeToSave);
        } catch (error) {
            console.error('[TopMapsStore] Failed to save to IndexedDB:', error);
        }
        pendingSave = null;
    };

    if (pendingSave) {
        pendingSave = pendingSave.then(doSave);
    } else {
        pendingSave = doSave();
    }
}

/**
 * Get the cached store, throwing if not initialized.
 * @returns The cached store
 * @throws Error if not initialized
 */
function getStore(): StoreV1 {
    if (!isInitialized || !cachedStore) {
        throw new Error('[TopMapsStore] Store not initialized. Call init() first.');
    }
    return cachedStore;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Add session time to daily totals, splitting across day boundaries.
 * @param dailyTotals - The daily totals record to update
 * @param map_id - The map identifier
 * @param startedAt - Session start timestamp
 * @param endedAt - Session end timestamp
 */
function addToDailyTotals(
    dailyTotals: DailyTotals,
    map_id: string,
    startedAt: number,
    endedAt: number
): void {
    let cursor = startedAt;

    while (cursor < endedAt) {
        const dayStart = startOfDay(cursor);
        const dayEnd = dayStart + MS_PER_DAY;

        const chunkStart = Math.max(cursor, dayStart);
        const chunkEnd = Math.min(endedAt, dayEnd);
        const ms = Math.max(0, chunkEnd - chunkStart);

        const key = dayKey(chunkStart);
        dailyTotals[key] ??= {};
        dailyTotals[key][map_id] = (dailyTotals[key][map_id] ?? 0) + ms;

        cursor = chunkEnd;
    }
}

/**
 * Remove old data from the store to prevent unbounded growth.
 * Runs at most once per hour. Removes data older than RETENTION_DAYS.
 * @param store - The store to clean up
 * @param now - Current timestamp
 */
function cleanup(store: StoreV1, now: number): void {
    const last = store.lastCleanupAt ?? 0;
    if (now - last < CLEANUP_INTERVAL_MS) return;

    const cutoff = startOfDay(now) - RETENTION_DAYS * MS_PER_DAY;

    // Prune old daily totals
    for (const k of Object.keys(store.dailyTotals)) {
        const ts = new Date(k).getTime();
        if (!Number.isFinite(ts) || ts < cutoff) {
            delete store.dailyTotals[k];
        }
    }

    // Prune old sessions
    store.sessions = store.sessions.filter(s => s.endedAt >= cutoff);

    store.lastCleanupAt = now;
}

/**
 * End the currently active session and persist it.
 * @param store - The store containing the active session
 * @param endAt - Timestamp to end the session at
 */
function endActiveSessionInternal(store: StoreV1, endAt: number): void {
    const active = store.activeSession;
    if (!active) return;

    // Discard invalid sessions (end before start)
    if (endAt <= active.startedAt) {
        store.activeSession = null;
        return;
    }

    const session: MapSession = {
        map_id: active.map_id,
        startedAt: active.startedAt,
        endedAt: endAt,
    };

    store.sessions.push(session);
    addToDailyTotals(store.dailyTotals, session.map_id, session.startedAt, session.endedAt);

    store.activeSession = null;
    cleanup(store, endAt);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Top Maps Store - Singleton for managing map play session data.
 * 
 * IMPORTANT: Call init() before using any other methods.
 * 
 * @example
 * ```ts
 * // Initialize on app startup
 * await topMapsStore.init();
 * 
 * // Start tracking a map session
 * topMapsStore.start("1234-5678-9012");
 * 
 * // Stop the current session
 * topMapsStore.stop();
 * 
 * // Read current data (synchronous after init)
 * const data = topMapsStore.read();
 * ```
 */
export const topMapsStore = {
    /**
     * Initialize the store. Must be called before any other operations.
     * Handles migration from localStorage if needed.
     * Safe to call multiple times.
     */
    async init(): Promise<void> {
        if (isInitialized) return;

        try {
            await storage.init();

            // Load existing data or create empty store
            cachedStore = (await loadFromDB()) ?? createEmptyStore();
            isInitialized = true;

            console.log('[TopMapsStore] Initialized successfully');
        } catch (error) {
            console.error('[TopMapsStore] Failed to initialize:', error);
            // Fall back to in-memory only
            cachedStore = createEmptyStore();
            isInitialized = true;
        }
    },

    /**
     * Check if the store is initialized.
     * @returns True if init() has completed
     */
    isReady(): boolean {
        return isInitialized;
    },

    /**
     * Start a new map session.
     * If another session is active, it will be closed first.
     * @param map_id - The map code to start tracking
     */
    start(map_id: string): void {
        const store = getStore();
        const now = nowMs();

        // Close any existing session (safety measure)
        if (store.activeSession?.map_id) {
            endActiveSessionInternal(store, now);
        }

        store.activeSession = { map_id, startedAt: now };
        saveAsync();
    },

    /**
     * Stop the current active session.
     * Does nothing if no session is active.
     */
    stop(): void {
        const store = getStore();
        endActiveSessionInternal(store, nowMs());
        saveAsync();
    },

    /**
     * Stop the active session only if it matches the given map ID.
     * Useful when leaving a specific map.
     * @param map_id - The map code to conditionally stop
     */
    stopIfActiveMapIs(map_id: string): void {
        const store = getStore();
        if (store.activeSession?.map_id === map_id) {
            endActiveSessionInternal(store, nowMs());
            saveAsync();
        }
    },

    /**
     * Recover from an abnormal shutdown.
     * If a session has been active for longer than MAX_SESSION_MS,
     * it will be automatically closed. Call this on app startup.
     */
    recover(): void {
        const store = getStore();
        const active = store.activeSession;
        if (!active) return;

        const now = nowMs();
        if (now - active.startedAt > MAX_SESSION_MS) {
            endActiveSessionInternal(store, now);
            saveAsync();
        }
    },

    /**
     * Read the current store state (synchronous after init).
     * @returns The current store data (readonly use recommended)
     */
    read(): StoreV1 {
        return getStore();
    },

    /**
     * Wait for any pending saves to complete.
     * Useful for testing or before app shutdown.
     */
    async flush(): Promise<void> {
        if (pendingSave) {
            await pendingSave;
        }
    },
};
