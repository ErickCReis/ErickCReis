import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const websocketStatSchema = v.object({
  timestamp: nonNegativeNumber,
  pendingWebSockets: nonNegativeNumber,
  cursorSubscribers: nonNegativeNumber,
});
export type WebSocketStat = v.InferOutput<typeof websocketStatSchema>;
