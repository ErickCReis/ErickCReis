import { describe, expect, test } from "bun:test";
import { app } from "./app";

describe("server routes", () => {
  test("GET /health returns ok", async () => {
    const response = await app.handle(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  test("GET /api/stats returns Bun metric fields", async () => {
    const response = await app.handle(new Request("http://localhost/api/stats"));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(typeof payload.timestamp).toBe("string");
    expect(typeof payload.uptimeSeconds).toBe("number");
    expect(typeof payload.memoryRssMb).toBe("number");
    expect(typeof payload.memoryHeapUsedMb).toBe("number");
    expect(typeof payload.memoryHeapTotalMb).toBe("number");
    expect(typeof payload.systemMemoryTotalMb).toBe("number");
    expect(typeof payload.systemMemoryFreeMb).toBe("number");
    expect(typeof payload.systemMemoryUsedPercent).toBe("number");
    expect(typeof payload.cpuCount).toBe("number");
    expect(typeof payload.cpuUsagePercent).toBe("number");
    expect(Array.isArray(payload.loadAverage)).toBe(true);
    expect(typeof payload.pendingRequests).toBe("number");
    expect(typeof payload.pendingWebSockets).toBe("number");
    expect(typeof payload.cursorSubscribers).toBe("number");
  });

  test("GET /api/stats/stream returns SSE payloads", async () => {
    const response = await app.handle(new Request("http://localhost/api/stats/stream"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const reader = response.body?.getReader();
    expect(reader).toBeTruthy();

    const firstChunk = (await reader!.read()) as ReadableStreamReadResult<Uint8Array>;
    const text =
      typeof firstChunk.value === "string"
        ? firstChunk.value
        : new TextDecoder().decode(firstChunk.value);
    expect(firstChunk.done).toBe(false);
    expect(text).toContain("event: stats");
    expect(text).toContain("data: ");

    await reader?.cancel();
  });
});
