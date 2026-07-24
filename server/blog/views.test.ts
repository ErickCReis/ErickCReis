import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BLOG_POST_VISITOR_ID_PATTERN } from "@shared/blog/views";
import { createBlogPostViewsStore } from "@server/blog/views";
import { createBlogVisitorId } from "@server/lib/id";

const DAY_MS = 24 * 60 * 60 * 1000;

const storesToClose = new Set<{ close: () => void }>();

function trackStore<T extends { close: () => void }>(store: T) {
  storesToClose.add(store);
  return store;
}

function createMemoryStore() {
  const db = new Database(":memory:");
  return trackStore(createBlogPostViewsStore({ client: db }));
}

afterEach(() => {
  for (const store of storesToClose) {
    store.close();
  }
  storesToClose.clear();
});

describe("createBlogPostViewsStore", () => {
  it("creates prefixed visitor ids", () => {
    const visitorId = createBlogVisitorId();

    expect(visitorId.startsWith("ct_")).toBe(true);
    expect(BLOG_POST_VISITOR_ID_PATTERN.test(visitorId)).toBe(true);
  });

  it("increments the first visit from zero to one", () => {
    const store = createMemoryStore();
    const visitorId = createBlogVisitorId();

    const result = store.registerPostView({ slug: "example-post", visitorId, nowMs: 1_000 });

    expect(result).toEqual({
      slug: "example-post",
      totalViews: 1,
      counted: true,
    });
    expect(store.getPostViewCounts(["example-post"])).toEqual({ "example-post": 1 });
  });

  it("does not increment for the same visitor within 24 hours", () => {
    const store = createMemoryStore();
    const visitorId = createBlogVisitorId();

    store.registerPostView({ slug: "example-post", visitorId, nowMs: 1_000 });
    const result = store.registerPostView({
      slug: "example-post",
      visitorId,
      nowMs: 1_000 + DAY_MS - 1,
    });

    expect(result).toEqual({
      slug: "example-post",
      totalViews: 1,
      counted: false,
    });
  });

  it("increments again for the same visitor after 24 hours", () => {
    const store = createMemoryStore();
    const visitorId = createBlogVisitorId();

    store.registerPostView({ slug: "example-post", visitorId, nowMs: 1_000 });
    const result = store.registerPostView({
      slug: "example-post",
      visitorId,
      nowMs: 1_000 + DAY_MS + 1,
    });

    expect(result).toEqual({
      slug: "example-post",
      totalViews: 2,
      counted: true,
    });
  });

  it("increments independently for different visitors", () => {
    const store = createMemoryStore();

    store.registerPostView({
      slug: "example-post",
      visitorId: createBlogVisitorId(),
      nowMs: 1_000,
    });
    const result = store.registerPostView({
      slug: "example-post",
      visitorId: createBlogVisitorId(),
      nowMs: 2_000,
    });

    expect(result.totalViews).toBe(2);
    expect(result.counted).toBe(true);
  });

  it("prunes stale dedupe rows without losing totals", () => {
    const db = new Database(":memory:");
    const store = trackStore(createBlogPostViewsStore({ client: db }));
    const visitorA = createBlogVisitorId();
    const visitorB = createBlogVisitorId();

    store.registerPostView({ slug: "example-post", visitorId: visitorA, nowMs: 1_000 });
    store.registerPostView({ slug: "example-post", visitorId: visitorB, nowMs: 2_000 });

    const result = store.registerPostView({
      slug: "example-post",
      visitorId: visitorA,
      nowMs: DAY_MS + 5_000,
    });

    const visitorRows = db
      .query<{ count: number }, []>("SELECT COUNT(*) AS count FROM blog_post_view_visitors")
      .get();

    expect(result).toEqual({
      slug: "example-post",
      totalViews: 3,
      counted: true,
    });
    expect(visitorRows?.count).toBe(1);
  });

  it("returns zero for unknown slugs in batch reads", () => {
    const store = createMemoryStore();

    const result = store.getPostViewCounts(["example-post", "missing-post"]);

    expect(result).toEqual({
      "example-post": 0,
      "missing-post": 0,
    });
  });

  it("accepts nested slugs", () => {
    const store = createMemoryStore();
    const result = store.registerPostView({
      slug: "notes/frontend/state-machines",
      visitorId: createBlogVisitorId(),
      nowMs: 1_000,
    });

    expect(result.slug).toBe("notes/frontend/state-machines");
    expect(result.totalViews).toBe(1);
  });

  it("accepts localized slugs", () => {
    const store = createMemoryStore();
    const result = store.registerPostView({
      slug: "example-post.pt-BR",
      visitorId: createBlogVisitorId(),
      nowMs: 1_000,
    });

    expect(result.slug).toBe("example-post.pt-BR");
    expect(result.totalViews).toBe(1);
  });

  it("creates the sqlite database file and schema for file-backed stores", async () => {
    const directory = await mkdtemp(join(tmpdir(), "blog-views-"));
    const filePath = join(directory, "server.sqlite");
    const store = trackStore(createBlogPostViewsStore({ filePath }));

    const counts = store.getPostViewCounts(["example-post"]);
    const fileStats = await stat(filePath);

    expect(counts).toEqual({ "example-post": 0 });
    expect(fileStats.isFile()).toBe(true);
  });
});
