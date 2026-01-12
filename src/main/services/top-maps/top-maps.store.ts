/**
 * @fileoverview Top Maps Store - Manages persistent storage for map play sessions.
 * Uses localStorage to persist session data across app restarts.
 * Data is automatically cleaned up after 90 days.
 */

import { startOfDay, dayKey, MS_PER_DAY, MS_PER_HOUR } from "../../../shared/utils/dateUtils";

/** Local storage key for the top maps data */
const LS_KEY = "fit.topMaps.v1";

/** Maximum session duration before auto-recovery (8 hours) */
const MAX_SESSION_MS = 8 * MS_PER_HOUR;

/** Number of days to retain data before cleanup */
const RETENTION_DAYS = 90;

/** Minimum interval between cleanup runs (1 hour) */
const CLEANUP_INTERVAL_MS = MS_PER_HOUR;

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Get the current timestamp in milliseconds.
 * Wrapped for potential future mocking in tests.
 * @returns Current Unix timestamp in ms
 */
function nowMs(): number {
    return Date.now();
}

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
// Storage Operations
// ============================================================================

/**
 * Load the store from localStorage.
 * Returns a fresh store if none exists or data is corrupted.
 * @returns The loaded or initialized store
 */
function load(): StoreV1 {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
        return createEmptyStore();
    }

    try {
        const parsed = JSON.parse(raw) as StoreV1;
        if (parsed.version !== 1) {
            return createEmptyStore();
        }
        return {
            version: 1,
            activeSession: parsed.activeSession ?? null,
            sessions: parsed.sessions ?? [],
            dailyTotals: parsed.dailyTotals ?? {},
            lastCleanupAt: parsed.lastCleanupAt,
        };
    } catch {
        return createEmptyStore();
    }
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
 * Persist the store to localStorage.
 * @param store - The store to save
 */
function save(store: StoreV1): void {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Add session time to daily totals, splitting across day boundaries.
 * Handles sessions that span multiple days by allocating time to each day.
 * 
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
 * 
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
 * Does nothing if no session is active or if endAt is before startedAt.
 * 
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
 * @example
 * ```ts
 * // Start tracking a map session
 * topMapsStore.start("1234-5678-9012");
 * 
 * // Stop the current session
 * topMapsStore.stop();
 * 
 * // Read current data
 * const data = topMapsStore.read();
 * ```
 */
export const topMapsStore = {
    /**
     * Start a new map session.
     * If another session is active, it will be closed first.
     * 
     * @param map_id - The map code to start tracking
     */
    start(map_id: string): void {
        const store = load();
        const now = nowMs();

        // Close any existing session (safety measure)
        if (store.activeSession?.map_id) {
            endActiveSessionInternal(store, now);
        }

        store.activeSession = { map_id, startedAt: now };
        save(store);
    },

    /**
     * Stop the current active session.
     * Does nothing if no session is active.
     */
    stop(): void {
        const store = load();
        endActiveSessionInternal(store, nowMs());
        save(store);
    },

    /**
     * Stop the active session only if it matches the given map ID.
     * Useful when leaving a specific map.
     * 
     * @param map_id - The map code to conditionally stop
     */
    stopIfActiveMapIs(map_id: string): void {
        const store = load();
        if (store.activeSession?.map_id === map_id) {
            endActiveSessionInternal(store, nowMs());
            save(store);
        }
    },

    /**
     * Recover from an abnormal shutdown.
     * If a session has been active for longer than MAX_SESSION_MS,
     * it will be automatically closed. Call this on app startup.
     */
    recover(): void {
        const store = load();
        const active = store.activeSession;
        if (!active) return;

        const now = nowMs();
        if (now - active.startedAt > MAX_SESSION_MS) {
            endActiveSessionInternal(store, now);
            save(store);
        }
    },

    /**
     * Read the current store state.
     * @returns The current store data (readonly use recommended)
     */
    read(): StoreV1 {
        return load();
    },
};
