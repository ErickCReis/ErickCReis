import { PublisherDurableObject } from "@orpc/experimental-publisher-durable-object";

export class CursorPositionDO extends PublisherDurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, {
      resume: {
        retentionSeconds: 60 * 2, // Retain events for 2 minutes to support resume
        cleanupIntervalSeconds: 12 * 60 * 60, // Interval for inactivity checks; if inactive, the DO is cleaned up (default: 12 hours)
      },
    });
  }
}
