import { TimeRange } from "../../../../../shared/consts";

export function getRangeMs(range: TimeRange, nowMs = Date.now()) {
    switch (range) {
        case "today": {
            const d = new Date(nowMs);
            d.setHours(0, 0, 0, 0);
            return { startMs: d.getTime(), endMs: nowMs };
        }
        case "7d":
            return { startMs: nowMs - 7 * 24 * 60 * 60 * 1000, endMs: nowMs };

        case "30d":
            return { startMs: nowMs - 30 * 24 * 60 * 60 * 1000, endMs: nowMs };

        case "all":
            return { startMs: 0, endMs: nowMs };
    }
};