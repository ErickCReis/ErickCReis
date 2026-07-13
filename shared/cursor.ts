import * as v from "valibot";

export const cursorPayloadSchema = v.object({
  id: v.string(),
  // Coordinates are relative to the document origin, not the viewport.
  x: v.number(),
  y: v.number(),
  color: v.optional(v.string()),
});
export type CursorPayload = v.InferOutput<typeof cursorPayloadSchema>;
