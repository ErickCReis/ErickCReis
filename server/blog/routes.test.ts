import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { createBlogPostViewsStore } from "@server/blog/views";
import { createBlogRoutes } from "@server/blog/routes";

const stores = new Set<{ close: () => void }>();

afterEach(() => {
  for (const store of stores) store.close();
  stores.clear();
});

function createApp() {
  const store = createBlogPostViewsStore({ client: new Database(":memory:") });
  stores.add(store);
  return createBlogRoutes(store);
}

function postView(app: ReturnType<typeof createApp>, slug: string, cookie?: string) {
  return app.handle(
    new Request("http://localhost/blog/views", {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ slug }),
    }),
  );
}

function getVisitorCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  return setCookie.match(/blogVisitorId=[^;]+/)?.[0];
}

describe("blog view routes", () => {
  it("does not count a view from a request without a visitor cookie", async () => {
    const app = createApp();

    const response = await postView(app, "example-post");

    expect(await response.json()).toEqual({
      slug: "example-post",
      totalViews: 0,
      counted: false,
    });
    expect(getVisitorCookie(response)).toBeDefined();
  });

  it("never counts clients that discard the cookie", async () => {
    const app = createApp();

    for (let i = 0; i < 5; i++) {
      await postView(app, "example-post");
    }
    const response = await app.handle(
      new Request("http://localhost/blog/views?slugs=example-post"),
    );

    expect(await response.json()).toEqual({ "example-post": 0 });
  });

  it("counts the view once the visitor cookie is sent back", async () => {
    const app = createApp();
    const cookie = getVisitorCookie(await postView(app, "example-post"));

    const counted = await postView(app, "example-post", cookie);
    const repeated = await postView(app, "example-post", cookie);

    expect(await counted.json()).toEqual({ slug: "example-post", totalViews: 1, counted: true });
    expect(await repeated.json()).toEqual({ slug: "example-post", totalViews: 1, counted: false });
  });

  it("assigns the visitor cookie when reading counts from the archive", async () => {
    const app = createApp();

    const response = await app.handle(
      new Request("http://localhost/blog/views?slugs=example-post"),
    );
    const cookie = getVisitorCookie(response);
    const counted = await postView(app, "example-post", cookie);

    expect(cookie).toBeDefined();
    expect(await counted.json()).toEqual({ slug: "example-post", totalViews: 1, counted: true });
  });
});
