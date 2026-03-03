import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const websocketStatSchema = v.object({
  timestamp: nonNegativeNumber,
  connectedUsers: nonNegativeNumber,
  maxConcurrentUsers: nonNegativeNumber,
  connectionStartedAt: nonNegativeNumber,
});
export type WebSocketStat = v.InferOutput<typeof websocketStatSchema>;
