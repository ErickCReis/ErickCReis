import { staticPlugin } from "@elysiajs/static";
import { Elysia, sse } from "elysia";
import { blog } from "content/blog";
import { z } from "zod";
import { latestStats, statsHistory, STATS_SAMPLE_INTERVAL_MS } from "./stats";

const cursorPayloadSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
});

export const app = new Elysia()
  .use(await staticPlugin({ assets: "./src/pages", prefix: "/" }))
  .get("/api/blog", async () => {
    const posts = await blog.list();
    return posts
      .map((post) => ({
        slug: post.path.replace(/\.(md|mdx)$/i, ""),
        title: post.compiled.frontmatter.title,
        description: post.compiled.frontmatter.description,
        date: new Date(post.compiled.frontmatter.date).toISOString().slice(0, 10),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  })
  .get("/api/stats", () => latestStats)
  .get("/api/stats/history", ({ set }) => {
    set.headers["cache-control"] = "no-store";
    return statsHistory;
  })
  .get("/api/stats/stream", async function* ({ set }) {
    set.headers["cache-control"] = "no-store";
    while (true) {
      yield sse({ event: "stats", data: latestStats });
      await Bun.sleep(STATS_SAMPLE_INTERVAL_MS);
    }
  })
  .ws("/api/live", {
    body: cursorPayloadSchema,
    response: cursorPayloadSchema,
    open(ws) {
      ws.subscribe("cursors");
    },
    message(ws, payload) {
      ws.publish("cursors", payload);
    },
    close(ws) {
      ws.unsubscribe("cursors");
    },
  });

export type App = typeof app;
