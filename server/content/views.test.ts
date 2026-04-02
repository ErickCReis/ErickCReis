import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createBlogPostViewsStore, createBlogVisitorId } from "@server/content/views";

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
  it("increments the first visit from zero to one", () => {
    const store = createMemoryStore();
    const visitorId = createBlogVisitorId();

    const result = store.registerPostView({ slug: "hello-world", visitorId, nowMs: 1_000 });

    expect(result).toEqual({
      slug: "hello-world",
      totalViews: 1,
      counted: true,
    });
    expect(store.getPostViewCounts(["hello-world"])).toEqual({ "hello-world": 1 });
  });

  it("does not increment for the same visitor within 24 hours", () => {
    const store = createMemoryStore();
    const visitorId = createBlogVisitorId();

    store.registerPostView({ slug: "hello-world", visitorId, nowMs: 1_000 });
    const result = store.registerPostView({
      slug: "hello-world",
      visitorId,
      nowMs: 1_000 + DAY_MS - 1,
    });

    expect(result).toEqual({
      slug: "hello-world",
      totalViews: 1,
      counted: false,
    });
  });

  it("increments again for the same visitor after 24 hours", () => {
    const store = createMemoryStore();
    const visitorId = createBlogVisitorId();

    store.registerPostView({ slug: "hello-world", visitorId, nowMs: 1_000 });
    const result = store.registerPostView({
      slug: "hello-world",
      visitorId,
      nowMs: 1_000 + DAY_MS + 1,
    });

    expect(result).toEqual({
      slug: "hello-world",
      totalViews: 2,
      counted: true,
    });
  });

  it("increments independently for different visitors", () => {
    const store = createMemoryStore();

    store.registerPostView({
      slug: "hello-world",
      visitorId: createBlogVisitorId(),
      nowMs: 1_000,
    });
    const result = store.registerPostView({
      slug: "hello-world",
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

    store.registerPostView({ slug: "hello-world", visitorId: visitorA, nowMs: 1_000 });
    store.registerPostView({ slug: "hello-world", visitorId: visitorB, nowMs: 2_000 });

    const result = store.registerPostView({
      slug: "hello-world",
      visitorId: visitorA,
      nowMs: DAY_MS + 5_000,
    });

    const visitorRows = db
      .query<{ count: number }, []>("SELECT COUNT(*) AS count FROM blog_post_view_visitors")
      .get();

    expect(result).toEqual({
      slug: "hello-world",
      totalViews: 3,
      counted: true,
    });
    expect(visitorRows?.count).toBe(1);
  });

  it("returns zero for unknown slugs in batch reads", () => {
    const store = createMemoryStore();

    const result = store.getPostViewCounts(["hello-world", "missing-post"]);

    expect(result).toEqual({
      "hello-world": 0,
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

  it("creates the sqlite database file and schema for file-backed stores", async () => {
    const directory = await mkdtemp(join(tmpdir(), "content-views-"));
    const filePath = join(directory, "server.sqlite");
    const store = trackStore(createBlogPostViewsStore({ filePath }));

    const counts = store.getPostViewCounts(["hello-world"]);
    const fileStats = await stat(filePath);

    expect(counts).toEqual({ "hello-world": 0 });
    expect(fileStats.isFile()).toBe(true);
  });
});
