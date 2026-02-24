import { MemoryPublisher } from "@orpc/experimental-publisher/memory";

type CursorEvents = {
  "cursor-position": { id: string; x: number; y: number };
};

export const publisher = new MemoryPublisher<CursorEvents>({
  resumeRetentionSeconds: 120,
});
