import { cron, Patterns } from "@elysia/cron";
import { createBlogReport } from "@server/blog/report";
import { createBlogPostViewsStore } from "@server/blog/views";
import { renderBlogReport } from "@server/email/blog-report";
import { SAO_PAULO_TIME_ZONE } from "@server/lib/date";
import { isEmailConfigured, sendEmail } from "@server/lib/email";

let blogViewsStore: ReturnType<typeof createBlogPostViewsStore> | null = null;

export async function sendScheduledBlogReport(now: Date | number = new Date()) {
  if (!isEmailConfigured()) return false;

  blogViewsStore ??= createBlogPostViewsStore();
  const message = renderBlogReport(createBlogReport(blogViewsStore, now));
  return sendEmail(message);
}

export const blogReportCron = cron({
  name: "blogReport",
  pattern: Patterns.EVERY_DAY_AT_MIDNIGHT,
  timezone: SAO_PAULO_TIME_ZONE,
  run: () => sendScheduledBlogReport(),
});
