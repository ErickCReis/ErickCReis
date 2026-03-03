import * as v from "valibot";

export const cursorPayloadSchema = v.object({
  id: v.string(),
  x: v.number(),
  y: v.number(),
  color: v.optional(v.string()),
});
export type CursorPayload = v.InferOutput<typeof cursorPayloadSchema>;
