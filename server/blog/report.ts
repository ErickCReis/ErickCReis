import {
  addCalendarDays,
  getCalendarDayOfWeek,
  getDateKey,
  getWeekStart,
  SAO_PAULO_TIME_ZONE,
} from "@server/lib/date";

export type BlogViewCount = {
  slug: string;
  views: number;
};

type BlogViewsReader = {
  getDailyViewCounts(date: string): BlogViewCount[];
  getWeeklyViewCounts(weekStart: string): BlogViewCount[];
};

type BlogReportBase = {
  startDate: string;
  endDate: string;
  views: BlogViewCount[];
  totalViews: number;
};

export type BlogReport =
  | (BlogReportBase & { kind: "daily" })
  | (BlogReportBase & { kind: "weekly"; previousDayViews: number });

function sortViewCounts(rows: BlogViewCount[]) {
  return [...rows].sort(
    (left, right) => right.views - left.views || left.slug.localeCompare(right.slug),
  );
}

function sumViews(rows: BlogViewCount[]) {
  return rows.reduce((total, row) => total + row.views, 0);
}

export function createBlogReport(
  store: BlogViewsReader,
  now: Date | number = new Date(),
): BlogReport {
  const currentDate = getDateKey(now, SAO_PAULO_TIME_ZONE);
  const previousDate = addCalendarDays(currentDate, -1);
  const previousDayViewCounts = store.getDailyViewCounts(previousDate);

  if (getCalendarDayOfWeek(currentDate) === 0) {
    const weekStart = getWeekStart(previousDate);
    const views = sortViewCounts(store.getWeeklyViewCounts(weekStart));
    return {
      kind: "weekly",
      startDate: weekStart,
      endDate: previousDate,
      views,
      totalViews: sumViews(views),
      previousDayViews: sumViews(previousDayViewCounts),
    };
  }

  const views = sortViewCounts(previousDayViewCounts);
  return {
    kind: "daily",
    startDate: previousDate,
    endDate: previousDate,
    views,
    totalViews: sumViews(views),
  };
}
