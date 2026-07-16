import { describe, expect, it } from "bun:test";
import { filterPublishedEntries, isBlogPostPublished } from "@web/lib/blog-publication";

const saoPauloJuly15AtNoon = new Date("2026-07-15T15:00:00.000Z");

function entry(id: string, date: string) {
  return {
    id,
    data: {
      date: new Date(`${date}T00:00:00.000Z`),
    },
  };
}

describe("isBlogPostPublished", () => {
  it("publishes a post dated before the current Sao Paulo date", () => {
    expect(isBlogPostPublished(new Date("2026-07-14T00:00:00.000Z"), saoPauloJuly15AtNoon)).toBe(
      true,
    );
  });

  it("publishes a post dated on the current Sao Paulo date", () => {
    expect(isBlogPostPublished(new Date("2026-07-15T00:00:00.000Z"), saoPauloJuly15AtNoon)).toBe(
      true,
    );
  });

  it("does not publish a post dated after the current Sao Paulo date", () => {
    expect(isBlogPostPublished(new Date("2026-07-16T00:00:00.000Z"), saoPauloJuly15AtNoon)).toBe(
      false,
    );
  });

  it("keeps a July 16 post hidden immediately before midnight in Sao Paulo", () => {
    expect(
      isBlogPostPublished(
        new Date("2026-07-16T00:00:00.000Z"),
        new Date("2026-07-16T02:59:59.000Z"),
      ),
    ).toBe(false);
  });

  it("publishes a July 16 post at midnight in Sao Paulo", () => {
    expect(
      isBlogPostPublished(
        new Date("2026-07-16T00:00:00.000Z"),
        new Date("2026-07-16T03:00:00.000Z"),
      ),
    ).toBe(true);
  });
});

describe("filterPublishedEntries", () => {
  it("preserves order without mutating the input", () => {
    const entries = [
      entry("older", "2026-07-14"),
      entry("scheduled", "2026-07-16"),
      entry("today", "2026-07-15"),
    ];
    const snapshot = [...entries];

    const published = filterPublishedEntries(entries, { now: saoPauloJuly15AtNoon });

    expect(published.map(({ id }) => id)).toEqual(["older", "today"]);
    expect(entries).toEqual(snapshot);
  });

  it("includes scheduled entries for local previews", () => {
    const entries = [entry("published", "2026-07-15"), entry("scheduled", "2026-07-16")];

    expect(
      filterPublishedEntries(entries, {
        includeScheduled: true,
        now: saoPauloJuly15AtNoon,
      }),
    ).toBe(entries);
  });
});
