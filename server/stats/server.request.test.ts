import { describe, expect, it } from "bun:test";
import { fetchMonitor } from "@server/stats/server";

function monitorPayload() {
  const configuredId = Number.parseInt(Bun.env.UPTIMEROBOT_MONITOR_ID ?? "", 10);
  return {
    stat: "ok",
    monitors: [{ id: Number.isFinite(configuredId) ? configuredId : 1, status: 2 }],
  };
}

async function captureError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error("Expected the promise to reject");
}

describe("fetchMonitor", () => {
  it("retries transient HTTP failures", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const fetchFn = async () => {
      calls++;
      if (calls < 3) return new Response("temporarily unavailable", { status: 503 });
      return Response.json(monitorPayload());
    };

    const monitor = await fetchMonitor(1_700_000_000_000, fetchFn, async (ms) => {
      sleeps.push(ms);
    });

    expect(monitor.status).toBe(2);
    expect(calls).toBe(3);
    expect(sleeps).toEqual([1_000, 2_000]);
  });

  it("does not retry permanent API errors", async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls++;
      return Response.json({ stat: "fail", error: { message: "invalid api key" } });
    };

    const error = await captureError(fetchMonitor(1_700_000_000_000, fetchFn, async () => {}));

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("invalid api key");
    expect(calls).toBe(1);
  });

  it("includes the upstream response in HTTP errors", async () => {
    const fetchFn = async () => new Response("upstream exploded", { status: 400 });

    const error = await captureError(fetchMonitor(1_700_000_000_000, fetchFn, async () => {}));

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("UptimeRobot request failed (400): upstream exploded");
  });
});
