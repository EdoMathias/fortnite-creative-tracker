import { topMapsStore } from "./top-maps.store";
import type { TimeRange, MapData } from "../../../shared/consts";


export type MapMeta = { title?: string; thumbnail?: string };
export type MapMetaResolver = (map_id: string) => MapMeta | undefined;

function startOfDay(ts: number) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function dayKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDuration(ms: number) {
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function lastNDaysKeys(n: number, now = Date.now()) {
    const today0 = startOfDay(now);
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        keys.push(dayKey(today0 - i * 24 * 60 * 60 * 1000));
    }
    return keys; // oldest -> newest
}

function rangeStartTs(range: TimeRange, now = Date.now()) {
    const today0 = startOfDay(now);
    if (range === "today") return today0;
    if (range === "7d") return today0 - 6 * 24 * 60 * 60 * 1000;
    if (range === "30d") return today0 - 29 * 24 * 60 * 60 * 1000;
    return 0;
}

function trendDirectionFrom7(days: number[]): "up" | "down" | "flat" {
    const first = days[0] ?? 0;
    const last = days[days.length - 1] ?? 0;

    // deadzone: ignore tiny changes under 2 minutes
    const delta = last - first;
    if (Math.abs(delta) < 2 * 60 * 1000) return "flat";
    return delta > 0 ? "up" : "down";
}

export function getTopMaps(range: TimeRange, resolveMeta?: MapMetaResolver): MapData[] {
    const store = topMapsStore.read();
    const now = Date.now();

    const fromTs = rangeStartTs(range, now);
    const keys = Object.keys(store.dailyTotals); // YYYY-MM-DD

    // 1) Sum totals per map for the selected range
    const totals = new Map<string, number>();
    const playCount = new Map<string, number>();
    let lastPlayedByMap = new Map<string, string>(); // ISO date string

    for (const k of keys) {
        const ts = new Date(k).getTime();
        if (!Number.isFinite(ts) || ts < fromTs) continue;

        const maps = store.dailyTotals[k];
        for (const map_id of Object.keys(maps)) {
            const ms = maps[map_id] ?? 0;
            totals.set(map_id, (totals.get(map_id) ?? 0) + ms);

            // playCount (rough): count a "played day" as 1. If you want true sessions, use sessions list.
            if (ms > 0) playCount.set(map_id, (playCount.get(map_id) ?? 0) + 1);

            // lastPlayed = most recent dayKey that has ms
            if (ms > 0) lastPlayedByMap.set(map_id, k);
        }
    }

    // 2) Build trend arrays for last 7 days (always momentum)
    const trendKeys = lastNDaysKeys(7, now);
    const trendByMap = new Map<string, number[]>();

    for (const map_id of totals.keys()) {
        const arr = trendKeys.map(k => store.dailyTotals[k]?.[map_id] ?? 0);
        trendByMap.set(map_id, arr);
    }

    // 3) Sort maps by time played (descending)
    const sorted = [...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([map_id, totalMs]) => ({ map_id, totalMs }));

    // 4) Convert to MapData rows
    const rows: MapData[] = sorted.map((item, idx) => {
        const meta = resolveMeta?.(item.map_id) ?? {};
        const trend = trendByMap.get(item.map_id) ?? Array(7).fill(0);

        return {
            map_id: item.map_id,
            title: meta.title,
            thumbnail: meta.thumbnail,
            rank: idx + 1,
            timePlayed: formatDuration(item.totalMs),
            trend,
            trendDirection: trendDirectionFrom7(trend),
            playCount: playCount.get(item.map_id),
            lastPlayed: lastPlayedByMap.get(item.map_id),
        };
    });

    return rows;
}