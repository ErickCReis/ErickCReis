import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { createServerDatabase, type CreateServerDatabaseOptions } from "@server/db/client";
import { blogPostViewTotals, blogPostViewVisitors } from "@server/db/schema";

const BLOG_POST_VIEW_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function createBlogPostViewsStore(options: CreateServerDatabaseOptions = {}) {
  const { db, close } = createServerDatabase(options);

  return {
    getPostViewCounts(slugs: string[]) {
      const normalizedSlugs = Array.from(new Set(slugs));
      if (normalizedSlugs.length === 0) return {};

      const rows = db
        .select({
          slug: blogPostViewTotals.slug,
          totalViews: blogPostViewTotals.totalViews,
        })
        .from(blogPostViewTotals)
        .where(inArray(blogPostViewTotals.slug, normalizedSlugs))
        .all();

      const viewMap = Object.fromEntries(normalizedSlugs.map((slug) => [slug, 0]));
      for (const row of rows) {
        viewMap[row.slug] = row.totalViews;
      }

      return viewMap;
    },

    registerPostView(input: { slug: string; visitorId: string; nowMs?: number }) {
      const { slug, visitorId, nowMs = Date.now() } = input;

      return db.transaction(
        (tx) => {
          const cutoffMs = nowMs - BLOG_POST_VIEW_DEDUPE_WINDOW_MS;

          tx.delete(blogPostViewVisitors)
            .where(lt(blogPostViewVisitors.lastCountedAtMs, cutoffMs))
            .run();

          const visitorRow = tx
            .select({
              lastCountedAtMs: blogPostViewVisitors.lastCountedAtMs,
            })
            .from(blogPostViewVisitors)
            .where(
              and(
                eq(blogPostViewVisitors.slug, slug),
                eq(blogPostViewVisitors.visitorId, visitorId),
              ),
            )
            .get();

          if (visitorRow && visitorRow.lastCountedAtMs >= cutoffMs) {
            const totalRow = tx
              .select({
                totalViews: blogPostViewTotals.totalViews,
              })
              .from(blogPostViewTotals)
              .where(eq(blogPostViewTotals.slug, slug))
              .get();

            return {
              slug,
              totalViews: Number(totalRow?.totalViews ?? 0),
              counted: false,
            };
          }

          tx.insert(blogPostViewVisitors)
            .values({
              slug,
              visitorId,
              lastCountedAtMs: nowMs,
            })
            .onConflictDoUpdate({
              target: [blogPostViewVisitors.slug, blogPostViewVisitors.visitorId],
              set: {
                lastCountedAtMs: nowMs,
              },
            })
            .run();

          tx.insert(blogPostViewTotals)
            .values({
              slug,
              totalViews: 1,
              updatedAtMs: nowMs,
            })
            .onConflictDoUpdate({
              target: blogPostViewTotals.slug,
              set: {
                totalViews: sql`${blogPostViewTotals.totalViews} + 1`,
                updatedAtMs: nowMs,
              },
            })
            .run();

          const totalRow = tx
            .select({
              totalViews: blogPostViewTotals.totalViews,
            })
            .from(blogPostViewTotals)
            .where(eq(blogPostViewTotals.slug, slug))
            .get();

          return {
            slug,
            totalViews: Number(totalRow?.totalViews ?? 0),
            counted: true,
          };
        },
        { behavior: "immediate" },
      );
    },

    close,
  };
}
