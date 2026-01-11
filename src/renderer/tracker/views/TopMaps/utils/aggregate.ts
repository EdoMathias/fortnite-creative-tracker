import { MapSession } from "../../../../../shared/consts";

function overlapMs(session: MapSession, rangeStart: number, rangeEnd: number): number {
    const start = Math.max(session.startedAt, rangeStart);
    const end = Math.min(session.endedAt, rangeEnd);
    return Math.max(0, end - start);
}

function startOfDayMs(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function buildDailyStarts(days: number, nowMs = Date.now()): number[] {
    const today0 = startOfDayMs(nowMs);
    const out: number[] = [];
    // oldest -> newest
    for (let i = days - 1; i >= 0; i--) {
        out.push(today0 - i * 24 * 60 * 60 * 1000);
    }
    return out;
}

function dayIndex(dailyStarts: number[], ts: number): number | null {
    const idx = Math.floor((startOfDayMs(ts) - dailyStarts[0]) / (24 * 60 * 60 * 1000));
    return idx >= 0 && idx < dailyStarts.length ? idx : null;
}

function trendPctFrom7(days: number[]): number | null {
    const first = days[0];
    const last = days[days.length - 1];
    if (first <= 0 && last <= 0) return null;
    if (first <= 0) return null; // treat as NEW
    return ((last - first) / first) * 100;
}

function trendDirectionFromPct(pct: number | null, days: number[]): "up" | "down" | "flat" {
    // If NEW spike
    if (pct === null) {
        if (days[0] === 0 && days[days.length - 1] > 0) return "up";
        return "flat";
    }
    // deadzone avoids flicker
    if (pct > 2) return "up";
    if (pct < -2) return "down";
    return "flat";
}

function trendLabelFrom7(days: number[]): string {
    const pct = trendPctFrom7(days);
    if (pct === null) {
        const isNew = days[0] === 0 && days[days.length - 1] > 0;
        return isNew ? "NEW" : "—";
    }
    const rounded = Math.round(pct);
    return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export type MapAgg = {
    title: string;
    map_id: string;
    totalMs: number;
    sessions: number;
    trendDailyMs7: number[];
};

export function aggregateMaps(
    sessions: MapSession[],
    rangeStartMs: number,
    rangeEndMs: number,
    nowMs = Date.now()
): MapAgg[] {
    const byMap = new Map<string, MapAgg>();
    const dailyStarts7 = buildDailyStarts(7, nowMs);

    for (const s of sessions) {
        // total time in selected range
        const playedInRange = overlapMs(s, rangeStartMs, rangeEndMs);
        if (playedInRange <= 0) continue;

        let agg = byMap.get(s.map_id);
        if (!agg) {
            agg = { title: "", map_id: s.map_id, totalMs: 0, sessions: 0, trendDailyMs7: Array(7).fill(0) };
            byMap.set(s.map_id, agg);
        }

        agg.totalMs += playedInRange;
        agg.sessions += 1;

        // trend is always last 7 days (momentum)
        const trendStartMs = dailyStarts7[0];
        const trendEndMs = nowMs;

        // Split across days (only within last 7 days window)
        const effectiveStart = Math.max(s.startedAt, trendStartMs);
        const effectiveEnd = Math.min(s.endedAt, trendEndMs);
        if (effectiveEnd <= effectiveStart) continue;

        const startDay = startOfDayMs(effectiveStart);
        const endDay = startOfDayMs(effectiveEnd);

        for (let t = startDay; t <= endDay; t += 24 * 60 * 60 * 1000) {
            const idx = dayIndex(dailyStarts7, t);
            if (idx === null) continue;

            const dayRangeStart = t;
            const dayRangeEnd = t + 24 * 60 * 60 * 1000;
            const part = overlapMs(
                s,
                Math.max(trendStartMs, dayRangeStart),
                Math.min(trendEndMs, dayRangeEnd)
            );
            if (part > 0) agg.trendDailyMs7[idx] += part;
        }
    }

    return [...byMap.values()];
}

export function toTopRows(
    aggs: MapAgg[],
    metaByCode: Record<string, { title: string }>
) {
    // sort by time played in selected range
    const sorted = [...aggs].sort((a, b) => b.totalMs - a.totalMs);

    return sorted.map((a, i) => {
        const label = trendLabelFrom7(a.trendDailyMs7);
        const pct = trendPctFrom7(a.trendDailyMs7);
        const dir = trendDirectionFromPct(pct, a.trendDailyMs7);

        return {
            rank: i + 1,
            map_id: a.map_id,
            title: a.title,
            timePlayedMs: a.totalMs,
            sessions: a.sessions,
            trendDailyMs7: a.trendDailyMs7,
            trendDirection: dir,
            trendLabel: label,
        };
    });
}
