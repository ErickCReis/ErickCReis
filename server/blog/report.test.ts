import { describe, expect, it } from "bun:test";
import { createBlogReport } from "@server/blog/report";
import { renderBlogReport } from "@server/email/blog-report";

describe("blog report", () => {
  it("builds a daily report for the previous São Paulo calendar day", () => {
    const store = {
      getDailyViewCounts: (date: string) => {
        expect(date).toBe("2026-07-26");
        return [
          { slug: "second-post", views: 2 },
          { slug: "top-post", views: 4 },
        ];
      },
      getWeeklyViewCounts: () => {
        throw new Error("daily reports must not query weekly aggregates");
      },
    };

    const report = createBlogReport(store, new Date("2026-07-27T03:00:00Z"));

    expect(report).toEqual({
      kind: "daily",
      startDate: "2026-07-26",
      endDate: "2026-07-26",
      views: [
        { slug: "top-post", views: 4 },
        { slug: "second-post", views: 2 },
      ],
      totalViews: 6,
    });
  });

  it("replaces Sunday's daily report with the completed weekly report", () => {
    const store = {
      getDailyViewCounts: (date: string) => {
        expect(date).toBe("2026-07-25");
        return [{ slug: "top-post", views: 2 }];
      },
      getWeeklyViewCounts: (weekStart: string) => {
        expect(weekStart).toBe("2026-07-19");
        return [
          { slug: "second-post", views: 3 },
          { slug: "top-post", views: 8 },
        ];
      },
    };

    const report = createBlogReport(store, new Date("2026-07-26T03:00:00Z"));

    expect(report).toEqual({
      kind: "weekly",
      startDate: "2026-07-19",
      endDate: "2026-07-25",
      views: [
        { slug: "top-post", views: 8 },
        { slug: "second-post", views: 3 },
      ],
      totalViews: 11,
      previousDayViews: 2,
    });
  });

  it("renders a compact report and escapes post slugs in HTML", () => {
    const message = renderBlogReport({
      kind: "daily",
      startDate: "2026-07-23",
      endDate: "2026-07-23",
      views: [{ slug: "typescript-<patterns>", views: 1 }],
      totalViews: 1,
    });

    expect(message.subject).toBe("Daily blog report: 1 read");
    expect(message.text).toContain("typescript-<patterns>: 1");
    expect(message.html).toContain("typescript-&lt;patterns>");
    expect(message.html).not.toContain("typescript-<patterns>");
  });
});
