type MemoryBoundaryInput = {
  cgroupUsedBytes: number | null;
  cgroupTotalBytes: number | null;
  hostUsedBytes: number;
  hostTotalBytes: number;
};

export function resolveMemoryBoundary(input: MemoryBoundaryInput) {
  if (input.cgroupUsedBytes !== null && input.cgroupTotalBytes !== null) {
    return {
      usedBytes: input.cgroupUsedBytes,
      totalBytes: input.cgroupTotalBytes,
    };
  }

  return {
    usedBytes: input.hostUsedBytes,
    totalBytes: input.hostTotalBytes,
  };
}
