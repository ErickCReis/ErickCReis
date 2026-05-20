import { describe, expect, it } from "bun:test";
import {
  buildDailyUptime,
  getCurrentStreakSeconds,
  getDailyRanges,
  STATUS_UP,
} from "@server/stats/uptime";

describe("getCurrentStreakSeconds", () => {
  const nowMs = 1_700_000_000_000;
  const nowSec = Math.floor(nowMs / 1000);

  it("returns 0 while the monitor is down", () => {
    expect(
      getCurrentStreakSeconds(nowMs, {
        status: 9,
        logs: [{ type: 1, datetime: nowSec - 3_600 }],
      }),
    ).toBe(0);
  });

  it("counts from the latest recovery log", () => {
    expect(
      getCurrentStreakSeconds(nowMs, {
        status: STATUS_UP,
        logs: [
          { type: 2, datetime: nowSec - 3_600 },
          { type: 1, datetime: nowSec - 7_200 },
        ],
      }),
    ).toBe(3_600);
  });

  it("returns 0 when the latest log is still an interruption", () => {
    expect(
      getCurrentStreakSeconds(nowMs, {
        status: STATUS_UP,
        logs: [
          { type: 1, datetime: nowSec - 300 },
          { type: 2, datetime: nowSec - 7_200 },
        ],
      }),
    ).toBe(0);
  });

  it("does not span a recent outage when an older recovery log exists", () => {
    expect(
      getCurrentStreakSeconds(nowMs, {
        status: STATUS_UP,
        create_datetime: nowSec - 86_400 * 30,
        logs: [
          { type: 2, datetime: nowSec - 3_600 },
          { type: 1, datetime: nowSec - 7_200 },
          { type: 2, datetime: nowSec - 86_400 * 10 },
        ],
      }),
    ).toBe(3_600);
  });
});

describe("buildDailyUptime", () => {
  it("maps custom_uptime_ranges to the requested UTC days", () => {
    const nowMs = Date.UTC(2026, 4, 20, 12, 0, 0);
    const ranges = getDailyRanges(nowMs);
    const percents = ranges.map((_, index) => (index === ranges.length - 1 ? 95.83 : 100));

    const daily = buildDailyUptime(nowMs, {
      create_datetime: Math.floor(Date.UTC(2026, 3, 1) / 1000),
      custom_uptime_ranges: percents.join("-"),
    });

    expect(daily.at(-1)).toEqual({
      date: ranges.at(-1)?.date,
      uptimePercent: 95.83,
    });
  });
});
