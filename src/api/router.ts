import { DurablePublisher } from "@orpc/experimental-publisher-durable-object";
import { os } from "@orpc/server";
import { env } from "cloudflare:workers";
import * as v from "valibot";

const publisher = new DurablePublisher<{
  "cursor-position": { id: string; x: number; y: number };
}>(env.CURSOR_POSITION);

const base = os.$context();

const live = base.handler(async function* ({ signal }) {
  console.log("live");
  const iterator = publisher.subscribe("cursor-position", { signal });
  for await (const payload of iterator) {
    console.log("payload", payload);
    yield payload;
  }
});

const publish = base
  .input(
    v.object({
      id: v.string(),
      x: v.number(),
      y: v.number(),
    }),
  )
  .handler(async ({ input }) => {
    console.log("publishing", input);
    await publisher.publish("cursor-position", input);
  });

export const router = {
  live,
  publish,
};
