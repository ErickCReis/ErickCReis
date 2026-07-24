import { Elysia, t } from "elysia";
import {
  BLOG_POST_VISITOR_ID_PATTERN,
  blogPostQueryRequestSchema,
  blogPostViewIncrementRequestSchema,
} from "@shared/blog/views";
import { createBlogPostViewsStore } from "@server/blog/views";
import { createBlogVisitorId } from "@server/lib/id";

const BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const blogVisitorCookieSchema = t.Cookie(
  { blogVisitorId: t.Optional(t.RegExp(BLOG_POST_VISITOR_ID_PATTERN)) },
  {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS,
    secure: Bun.env.NODE_ENV === "production",
  },
);

const blogPostViewsStore = createBlogPostViewsStore();

export const blogRoutes = new Elysia({ name: "blog-routes" })
  .get(
    "/blog/views",
    ({ query, set }) => {
      set.headers["cache-control"] = "no-store";
      return blogPostViewsStore.getPostViewCounts(query.slugs);
    },
    {
      query: blogPostQueryRequestSchema,
    },
  )
  .post(
    "/blog/views",
    ({ body, cookie, set }) => {
      set.headers["cache-control"] = "no-store";
      const visitorId = (cookie.blogVisitorId.value ??= createBlogVisitorId());
      return blogPostViewsStore.registerPostView({
        slug: body.slug,
        visitorId,
      });
    },
    {
      body: blogPostViewIncrementRequestSchema,
      cookie: blogVisitorCookieSchema,
    },
  );
