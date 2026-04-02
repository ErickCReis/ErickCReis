import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const blogPostViewTotals = sqliteTable("blog_post_view_totals", {
  slug: text("slug").primaryKey(),
  totalViews: integer("total_views").notNull(),
  updatedAtMs: integer("updated_at_ms").notNull(),
});

export const blogPostViewVisitors = sqliteTable(
  "blog_post_view_visitors",
  {
    slug: text("slug").notNull(),
    visitorId: text("visitor_id").notNull(),
    lastCountedAtMs: integer("last_counted_at_ms").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.slug, table.visitorId] }),
    index("blog_post_view_visitors_last_counted_at_idx").on(table.lastCountedAtMs),
  ],
);

export const schema = {
  blogPostViewTotals,
  blogPostViewVisitors,
};
