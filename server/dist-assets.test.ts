import { describe, expect, it } from "bun:test";
import { compress } from "@elysia/compress";
import { Elysia } from "elysia";
import { createDistAssetsSubrouter } from "@server/dist-assets";

describe("dist asset cache validation", () => {
  it("returns an ETag and revalidates matching requests", async () => {
    const app = createDistAssetsSubrouter();
    const initial = await app.handle(new Request("http://localhost/"));
    const etag = initial.headers.get("etag");

    expect(initial.status).toBe(200);
    expect(initial.headers.get("cache-control")).toBe("no-cache");
    expect(etag).toMatch(/^W\/"[0-9a-f]{16}"$/);

    const revalidated = await app.handle(
      new Request("http://localhost/", {
        headers: { "if-none-match": etag! },
      }),
    );

    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get("etag")).toBe(etag);
    expect(revalidated.headers.get("cache-control")).toBe("no-cache");
    expect(await revalidated.text()).toBe("");
  });

  it("uses weak comparison and supports validator lists", async () => {
    const app = createDistAssetsSubrouter();
    const initial = await app.handle(new Request("http://localhost/"));
    const etag = initial.headers.get("etag");

    const response = await app.handle(
      new Request("http://localhost/", {
        headers: { "if-none-match": `"outdated", ${etag!.replace(/^W\//, "")}` },
      }),
    );

    expect(response.status).toBe(304);
  });

  it("returns the asset when the validator does not match", async () => {
    const app = createDistAssetsSubrouter();
    const response = await app.handle(
      new Request("http://localhost/", {
        headers: { "if-none-match": '"outdated"' },
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.text()).length).toBeGreaterThan(0);
  });

  it("compresses globally and leaves 304 responses untouched", async () => {
    const app = new Elysia().use(compress()).use(createDistAssetsSubrouter());
    const compressed = await app.handle(
      new Request("http://localhost/", {
        headers: { "accept-encoding": "gzip" },
      }),
    );
    const etag = compressed.headers.get("etag");

    expect(compressed.status).toBe(200);
    expect(compressed.headers.get("content-encoding")).toBe("gzip");
    expect(compressed.headers.get("vary")).toContain("Accept-Encoding");

    const html = new TextDecoder().decode(Bun.gunzipSync(await compressed.bytes()));
    expect(html).toContain("<!DOCTYPE html>");

    const revalidated = await app.handle(
      new Request("http://localhost/", {
        headers: {
          "accept-encoding": "gzip",
          "if-none-match": etag!,
        },
      }),
    );

    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get("content-encoding")).toBeNull();
    expect(await revalidated.text()).toBe("");
  });
});
