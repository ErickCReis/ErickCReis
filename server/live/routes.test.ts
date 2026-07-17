import { describe, expect, it } from "bun:test";
import { liveRoutes } from "@server/live/routes";

describe("GET /live/id", () => {
  it("stores a generated cursor ID in the HTTP-only cookie", async () => {
    const response = await liveRoutes.handle(new Request("http://localhost/live/id"));
    const { cursorId } = (await response.json()) as { cursorId: string };

    expect(cursorId).toBeTruthy();
    expect(response.headers.get("set-cookie")).toContain(`cursorId=${cursorId}`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("preserves an existing cursor ID", async () => {
    const response = await liveRoutes.handle(
      new Request("http://localhost/live/id", {
        headers: { cookie: "cursorId=existing-cursor" },
      }),
    );

    expect(await response.json()).toEqual({ cursorId: "existing-cursor" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
