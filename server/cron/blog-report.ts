import { cron, Patterns } from "@elysiajs/cron";
import { createBlogReport } from "@server/blog/report";
import { createBlogPostViewsStore } from "@server/blog/views";
import { renderBlogReport } from "@server/email/blog-report";
import { SAO_PAULO_TIME_ZONE } from "@server/lib/date";
import { isEmailConfigured, sendEmail } from "@server/lib/email";

const BLOG_REPORT_EMAIL_TO = Bun.env.BLOG_REPORT_EMAIL_TO?.trim() || null;
let blogViewsStore: ReturnType<typeof createBlogPostViewsStore> | null = null;

export async function sendScheduledBlogReport(now: Date | number = new Date()) {
  if (!isEmailConfigured() || !BLOG_REPORT_EMAIL_TO) return false;

  blogViewsStore ??= createBlogPostViewsStore();
  const message = renderBlogReport(createBlogReport(blogViewsStore, now));
  return sendEmail({
    to: BLOG_REPORT_EMAIL_TO,
    ...message,
  });
}

export const blogReportCron = cron({
  name: "blogReport",
  pattern: Patterns.EVERY_DAY_AT_MIDNIGHT,
  timezone: SAO_PAULO_TIME_ZONE,
  run: () => sendScheduledBlogReport(),
});
