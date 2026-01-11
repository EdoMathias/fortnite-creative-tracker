const LS_KEY = "fit.topMaps.v1";

export type ActiveSession = {
    map_id: string;
    startedAt: number;
};

export type MapSession = {
    map_id: string;
    startedAt: number;
    endedAt: number;
};

export type DailyTotals = Record<string /*YYYY-MM-DD*/, Record<string /*map_id*/, number /*ms*/>>;

export type StoreV1 = {
    version: 1;
    activeSession: ActiveSession | null;
    sessions: MapSession[];       // optional but useful
    dailyTotals: DailyTotals;     // used for Top Maps
    lastCleanupAt?: number;
};

function nowMs() {
    return Date.now();
}

function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function dayKey(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function load(): StoreV1 {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { version: 1, activeSession: null, sessions: [], dailyTotals: {} };

    try {
        const parsed = JSON.parse(raw) as StoreV1;
        if (parsed.version !== 1) {
            return { version: 1, activeSession: null, sessions: [], dailyTotals: {} };
        }
        return {
            version: 1,
            activeSession: parsed.activeSession ?? null,
            sessions: parsed.sessions ?? [],
            dailyTotals: parsed.dailyTotals ?? {},
            lastCleanupAt: parsed.lastCleanupAt,
        };
    } catch {
        return { version: 1, activeSession: null, sessions: [], dailyTotals: {} };
    }
}

function save(store: StoreV1) {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
}

function addToDailyTotals(dailyTotals: DailyTotals, map_id: string, startedAt: number, endedAt: number) {
    let cursor = startedAt;

    while (cursor < endedAt) {
        const dayStart = startOfDay(cursor);
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const chunkStart = Math.max(cursor, dayStart);
        const chunkEnd = Math.min(endedAt, dayEnd);
        const ms = Math.max(0, chunkEnd - chunkStart);

        const key = dayKey(chunkStart);
        dailyTotals[key] ??= {};
        dailyTotals[key][map_id] = (dailyTotals[key][map_id] ?? 0) + ms;

        cursor = chunkEnd;
    }
}

function cleanup(store: StoreV1, now: number) {
    const last = store.lastCleanupAt ?? 0;
    if (now - last < 60 * 60 * 1000) return;

    const keepDays = 90;
    const cutoff = startOfDay(now) - keepDays * 24 * 60 * 60 * 1000;

    // prune dailyTotals
    for (const k of Object.keys(store.dailyTotals)) {
        const ts = new Date(k).getTime();
        if (!Number.isFinite(ts) || ts < cutoff) delete store.dailyTotals[k];
    }

    // prune sessions
    store.sessions = store.sessions.filter(s => s.endedAt >= cutoff);

    store.lastCleanupAt = now;
}

function endActiveSessionInternal(store: StoreV1, endAt: number) {
    const active = store.activeSession;
    if (!active) return;

    if (endAt <= active.startedAt) {
        store.activeSession = null;
        return;
    }

    const session: MapSession = { map_id: active.map_id, startedAt: active.startedAt, endedAt: endAt };
    store.sessions.push(session);
    addToDailyTotals(store.dailyTotals, session.map_id, session.startedAt, session.endedAt);

    store.activeSession = null;
    cleanup(store, endAt);
}

export const topMapsStore = {
    start(map_id: string) {
        const store = load();
        const now = nowMs();

        // If another session is active, close it (safety)
        if (store.activeSession?.map_id) {
            endActiveSessionInternal(store, now);
        }

        store.activeSession = { map_id, startedAt: now };
        save(store);
    },

    stop() {
        const store = load();
        endActiveSessionInternal(store, nowMs());
        save(store);
    },

    stopIfActiveMapIs(map_id: string) {
        const store = load();
        if (store.activeSession?.map_id === map_id) {
            endActiveSessionInternal(store, nowMs());
            save(store);
        }
    },

    // call on app init (optional)
    recover() {
        const store = load();
        const active = store.activeSession;
        if (!active) return;

        const now = nowMs();
        const maxMs = 8 * 60 * 60 * 1000; // safety cap
        if (now - active.startedAt > maxMs) {
            endActiveSessionInternal(store, now);
            save(store);
        }
    },

    read() {
        return load();
    },
};