import { Elysia, t } from "elysia";
import { blog } from "content/blog";

const cursorPayloadSchema = t.Object({
  id: t.String(),
  x: t.Number(),
  y: t.Number(),
});

export const app = new Elysia()
  .get("/health", () => "ok")
  .get("/api/blog", async () => {
    const posts = await blog.list();
    return posts
      .map((post) => ({
        slug: post.path.replace(/\.(md|mdx)$/i, ""),
        title: post.compiled.frontmatter.title,
        description: post.compiled.frontmatter.description,
        date: post.compiled.frontmatter.date,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  })
  .ws("/api/live", {
    body: cursorPayloadSchema,
    response: cursorPayloadSchema,
    message(ws, payload) {
      ws.send(payload);
    },
  });

export type App = typeof app;
