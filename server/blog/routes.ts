import { Elysia, t } from "elysia";
import {
  BLOG_POST_SLUG_MAX_LENGTH,
  BLOG_POST_SLUG_PATTERN,
  BLOG_POST_VIEW_MAX_BATCH_SLUGS,
  BLOG_POST_VISITOR_ID_PATTERN,
  blogPostViewIncrementRequestSchema,
} from "@shared/blog/views";
import { createBlogPostViewsStore } from "@server/blog/views";
import { createBlogVisitorId } from "@server/lib/id";

const BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const blogPostQuerySchema = t.Object({
  slugs: t.Array(
    t.String({
      minLength: 1,
      maxLength: BLOG_POST_SLUG_MAX_LENGTH,
      pattern: BLOG_POST_SLUG_PATTERN.source,
    }),
    { minItems: 1, maxItems: BLOG_POST_VIEW_MAX_BATCH_SLUGS },
  ),
});

const blogVisitorCookieSchema = t.Cookie(
  { blogVisitorId: t.Optional(t.String({ pattern: BLOG_POST_VISITOR_ID_PATTERN.source })) },
  {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS,
    secure: Bun.env.NODE_ENV === "production",
  },
);

type BlogPostViewsStore = ReturnType<typeof createBlogPostViewsStore>;

export function createBlogRoutes(store: BlogPostViewsStore = createBlogPostViewsStore()) {
  return new Elysia({ name: "blog-routes" })
    .get(
      "/blog/views",
      {
        query: blogPostQuerySchema,
        cookie: blogVisitorCookieSchema,
      },
      ({ query, cookie, set }) => {
        set.headers["cache-control"] = "no-store";
        // Readers who arrive through the archive get their cookie before opening a post.
        cookie.blogVisitorId.value ??= createBlogVisitorId();
        return store.getPostViewCounts(query.slugs);
      },
    )
    .post(
      "/blog/views",
      {
        body: blogPostViewIncrementRequestSchema,
        cookie: blogVisitorCookieSchema,
      },
      ({ body, cookie, set }) => {
        set.headers["cache-control"] = "no-store";
        const visitorId = cookie.blogVisitorId.value;

        // A request without a cookie only receives one. Clients that discard cookies
        // would otherwise get a fresh visitor ID, and a counted view, on every request.
        if (!visitorId) {
          cookie.blogVisitorId.value = createBlogVisitorId();
          return {
            slug: body.slug,
            totalViews: store.getPostViewCounts([body.slug])[body.slug] ?? 0,
            counted: false,
          };
        }

        return store.registerPostView({ slug: body.slug, visitorId });
      },
    );
}

export const blogRoutes = createBlogRoutes();
