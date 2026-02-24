import { handle } from "@astrojs/cloudflare/handler";
import { CursorPositionDO } from "./durable-objects/cursor-position";

export { CursorPositionDO };

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
