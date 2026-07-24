import * as v from "valibot";

export const BLOG_POST_SLUG_MAX_LENGTH = 160;
export const BLOG_POST_SLUG_PATTERN = /^[A-Za-z0-9]+(?:[./_-][A-Za-z0-9]+)*$/;
export const BLOG_POST_VIEW_MAX_BATCH_SLUGS = 100;
export const BLOG_POST_VISITOR_ID_PATTERN = /^ct_[A-Za-z0-9_-]{21}$/;

export const blogPostSlugSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(BLOG_POST_SLUG_MAX_LENGTH),
  v.regex(BLOG_POST_SLUG_PATTERN),
);
export type BlogPostSlug = v.InferOutput<typeof blogPostSlugSchema>;

export const blogPostQueryRequestSchema = v.object({
  slugs: v.pipe(
    v.array(blogPostSlugSchema),
    v.minLength(1),
    v.maxLength(BLOG_POST_VIEW_MAX_BATCH_SLUGS),
  ),
});
export type BlogPostQueryRequest = v.InferOutput<typeof blogPostQueryRequestSchema>;

export const blogPostViewIncrementRequestSchema = v.object({
  slug: blogPostSlugSchema,
});
export type BlogPostViewIncrementRequest = v.InferOutput<typeof blogPostViewIncrementRequestSchema>;
