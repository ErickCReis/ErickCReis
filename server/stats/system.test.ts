import { describe, expect, it } from "bun:test";
import { resolveMemoryBoundary } from "@server/stats/system-memory";

describe("resolveMemoryBoundary", () => {
  const host = {
    hostUsedBytes: 8 * 1024,
    hostTotalBytes: 16 * 1024,
  };

  it("uses cgroup memory when both current usage and a finite limit are available", () => {
    expect(
      resolveMemoryBoundary({
        ...host,
        cgroupUsedBytes: 640,
        cgroupTotalBytes: 1024,
      }),
    ).toEqual({ usedBytes: 640, totalBytes: 1024 });
  });

  it("uses the host boundary when the cgroup has no finite limit", () => {
    expect(
      resolveMemoryBoundary({
        ...host,
        cgroupUsedBytes: 640,
        cgroupTotalBytes: null,
      }),
    ).toEqual({ usedBytes: host.hostUsedBytes, totalBytes: host.hostTotalBytes });
  });

  it("uses the host boundary when cgroup usage is unavailable", () => {
    expect(
      resolveMemoryBoundary({
        ...host,
        cgroupUsedBytes: null,
        cgroupTotalBytes: 1024,
      }),
    ).toEqual({ usedBytes: host.hostUsedBytes, totalBytes: host.hostTotalBytes });
  });
});
