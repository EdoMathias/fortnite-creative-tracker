import type { TimeRange } from "../consts";
import { topMapsStore } from "../../main/services/top-maps/top-maps.store";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sumTimeByMap(range: TimeRange, now = Date.now()): Map<string, number> {
  const { dailyTotals } = topMapsStore.read();

  let fromTs = 0;
  const today0 = startOfDay(now);

  if (range === "today") fromTs = today0;
  if (range === "7d") fromTs = today0 - 6 * 24 * 60 * 60 * 1000;
  if (range === "30d") fromTs = today0 - 29 * 24 * 60 * 60 * 1000;
  if (range === "all") fromTs = 0;

  const totals = new Map<string, number>();

  for (const dayKey of Object.keys(dailyTotals)) {
    const ts = new Date(dayKey).getTime();
    if (!Number.isFinite(ts) || ts < fromTs) continue;

    const maps = dailyTotals[dayKey];
    for (const mapId of Object.keys(maps)) {
      totals.set(mapId, (totals.get(mapId) ?? 0) + maps[mapId]);
    }
  }

  return totals;
}